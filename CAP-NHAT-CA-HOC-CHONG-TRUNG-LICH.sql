-- ============================================================
-- QUẢN LÝ CA HỌC, GIỚI HẠN SỐ LƯỢNG VÀ CHỐNG TRÙNG LỊCH
-- Yêu cầu đã chạy:
--   1. KHOI-TAO-SUPABASE-MOI.sql
--   2. CAP-NHAT-NHIEU-BUOI-THUC-HANH.sql
--   3. CAP-NHAT-DANG-KY-LICH-THUC-HANH.sql
-- Chạy toàn bộ file này 1 lần trong Supabase SQL Editor.
-- ============================================================

begin;

create table if not exists public.training_slots (
  id uuid primary key default extensions.gen_random_uuid(),
  session_type text not null check (session_type in ('familiar', 'practice')),
  starts_at timestamptz not null,
  duration_minutes integer not null default 120
    check (duration_minutes between 30 and 480),
  location text not null default '',
  instructor_name text not null default '',
  vehicle_plate text not null default '',
  capacity integer not null default 1 check (capacity between 1 and 100),
  status text not null default 'open'
    check (status in ('open', 'closed', 'cancelled')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists training_slots_date_idx
  on public.training_slots(starts_at);

create index if not exists training_slots_resource_idx
  on public.training_slots(instructor_name, vehicle_plate, starts_at);

alter table public.training_slots enable row level security;
revoke all on public.training_slots from anon, authenticated;

alter table public.student_training_sessions
  add column if not exists slot_id uuid references public.training_slots(id) on delete set null;

alter table public.student_training_requests
  add column if not exists slot_id uuid references public.training_slots(id) on delete set null;

create unique index if not exists student_training_sessions_student_slot_unique
  on public.student_training_sessions(student_id, slot_id)
  where slot_id is not null;

create unique index if not exists student_training_requests_pending_slot_unique
  on public.student_training_requests(student_id, slot_id)
  where slot_id is not null and status = 'pending';

create or replace function public.app_list_training_slots(
  p_token text,
  p_session_type text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_account_kind text;
begin
  begin
    v_me := public.app_me(p_token);
    v_account_kind := 'manager';
  exception
    when others then
      v_me := public.app_student_me(p_token);
      v_account_kind := 'student';
  end;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', slot.id,
        'session_type', slot.session_type,
        'starts_at', slot.starts_at,
        'duration_minutes', slot.duration_minutes,
        'ends_at', slot.starts_at + make_interval(mins => slot.duration_minutes),
        'location', slot.location,
        'instructor_name', slot.instructor_name,
        'vehicle_plate', slot.vehicle_plate,
        'capacity', slot.capacity,
        'booked_count', (
          select count(*)
          from public.student_training_sessions session
          where session.slot_id = slot.id
        ),
        'pending_count', (
          select count(*)
          from public.student_training_requests request
          where request.slot_id = slot.id
            and request.status = 'pending'
        ),
        'available_count', greatest(
          slot.capacity - (
            select count(*)
            from public.student_training_sessions session
            where session.slot_id = slot.id
          ) - (
            select count(*)
            from public.student_training_requests request
            where request.slot_id = slot.id
              and request.status = 'pending'
          ),
          0
        ),
        'status', slot.status,
        'note', slot.note,
        'created_at', slot.created_at,
        'updated_at', slot.updated_at
      )
      order by slot.starts_at, slot.created_at
    )
    from public.training_slots slot
    where (
      nullif(btrim(coalesce(p_session_type, '')), '') is null
      or slot.session_type = btrim(p_session_type)
    )
    and (
      v_account_kind = 'manager'
      or (
        slot.status = 'open'
        and slot.starts_at > now()
        and (
          select count(*)
          from public.student_training_sessions session
          where session.slot_id = slot.id
        ) + (
          select count(*)
          from public.student_training_requests request
          where request.slot_id = slot.id
            and request.status = 'pending'
        ) < slot.capacity
      )
    )
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_admin_save_training_slot(
  p_token text,
  p_slot_id text,
  p_session_type text,
  p_starts_at text,
  p_duration_minutes integer,
  p_location text,
  p_instructor_name text,
  p_vehicle_plate text,
  p_capacity integer,
  p_note text,
  p_status text
)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
  v_starts_at timestamptz;
  v_ends_at timestamptz;
  v_duration integer;
  v_capacity integer;
  v_booked integer;
  v_instructor text;
  v_vehicle text;
  v_conflict public.training_slots;
begin
  perform public.app_require_admin(p_token);

  if coalesce(p_session_type, '') not in ('familiar', 'practice') then
    raise exception 'Nội dung ca học không hợp lệ.';
  end if;
  if coalesce(p_status, '') not in ('open', 'closed', 'cancelled') then
    raise exception 'Trạng thái ca học không hợp lệ.';
  end if;

  begin
    v_starts_at := btrim(coalesce(p_starts_at, ''))::timestamptz;
  exception
    when invalid_datetime_format or datetime_field_overflow then
      raise exception 'Ngày và giờ ca học không hợp lệ.';
  end;

  v_duration := coalesce(p_duration_minutes, 120);
  v_capacity := coalesce(p_capacity, 1);
  if v_duration < 30 or v_duration > 480 then
    raise exception 'Thời lượng phải từ 30 đến 480 phút.';
  end if;
  if v_capacity < 1 or v_capacity > 100 then
    raise exception 'Số lượng học viên phải từ 1 đến 100.';
  end if;

  if nullif(btrim(coalesce(p_slot_id, '')), '') is not null then
    begin
      v_id := btrim(p_slot_id)::uuid;
    exception
      when invalid_text_representation then
        raise exception 'Ca học không hợp lệ.';
    end;
  end if;

  select count(*)::integer
  into v_booked
  from public.student_training_sessions
  where slot_id = v_id;

  if v_capacity < v_booked then
    raise exception 'Ca học đã có % học viên; không thể giảm sức chứa xuống %.', v_booked, v_capacity;
  end if;

  v_ends_at := v_starts_at + make_interval(mins => v_duration);
  v_instructor := btrim(coalesce(p_instructor_name, ''));
  v_vehicle := upper(btrim(coalesce(p_vehicle_plate, '')));

  select slot.*
  into v_conflict
  from public.training_slots slot
  where slot.id is distinct from v_id
    and slot.status <> 'cancelled'
    and slot.starts_at < v_ends_at
    and slot.starts_at + make_interval(mins => slot.duration_minutes) > v_starts_at
    and (
      (
        v_instructor <> ''
        and lower(btrim(slot.instructor_name)) = lower(v_instructor)
      )
      or (
        v_vehicle <> ''
        and upper(btrim(slot.vehicle_plate)) = v_vehicle
      )
    )
  order by slot.starts_at
  limit 1;

  if v_conflict.id is not null then
    if v_instructor <> ''
       and lower(btrim(v_conflict.instructor_name)) = lower(v_instructor) then
      raise exception 'Giáo viên % đã có ca học trùng thời gian.', v_instructor;
    end if;
    raise exception 'Xe % đã có ca học trùng thời gian.', v_vehicle;
  end if;

  if v_id is null then
    insert into public.training_slots(
      session_type, starts_at, duration_minutes, location,
      instructor_name, vehicle_plate, capacity, note, status
    )
    values (
      p_session_type, v_starts_at, v_duration, btrim(coalesce(p_location, '')),
      v_instructor, v_vehicle, v_capacity, btrim(coalesce(p_note, '')), p_status
    )
    returning id into v_id;
  else
    update public.training_slots
    set session_type = p_session_type,
        starts_at = v_starts_at,
        duration_minutes = v_duration,
        location = btrim(coalesce(p_location, '')),
        instructor_name = v_instructor,
        vehicle_plate = v_vehicle,
        capacity = v_capacity,
        note = btrim(coalesce(p_note, '')),
        status = p_status,
        updated_at = now()
    where id = v_id;

    if not found then
      raise exception 'Không tìm thấy ca học.';
    end if;

    update public.student_training_sessions
    set session_type = p_session_type,
        starts_at = v_starts_at,
        location = btrim(coalesce(p_location, '')),
        updated_at = now()
    where slot_id = v_id;
  end if;

  return v_id::text;
end;
$$;

create or replace function public.app_admin_delete_training_slot(
  p_token text,
  p_slot_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
  v_linked integer;
begin
  perform public.app_require_admin(p_token);

  begin
    v_id := btrim(coalesce(p_slot_id, ''))::uuid;
  exception
    when invalid_text_representation then
      raise exception 'Ca học không hợp lệ.';
  end;

  select
    (select count(*) from public.student_training_sessions where slot_id = v_id)
    + (select count(*) from public.student_training_requests where slot_id = v_id and status = 'pending')
  into v_linked;

  if v_linked > 0 then
    raise exception 'Ca học đang có học viên hoặc yêu cầu chờ duyệt. Hãy chuyển trạng thái sang Đã đóng thay vì xóa.';
  end if;

  delete from public.training_slots where id = v_id;
  if not found then
    raise exception 'Không tìm thấy ca học.';
  end if;

  return true;
end;
$$;

create or replace function public.app_student_create_training_request_slot(
  p_token text,
  p_slot_id text,
  p_note text
)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_student_id uuid;
  v_slot public.training_slots;
  v_reserved integer;
  v_id uuid;
  v_ends_at timestamptz;
begin
  v_me := public.app_student_me(p_token);
  v_student_id := (v_me->>'student_id')::uuid;

  begin
    select *
    into v_slot
    from public.training_slots
    where id = btrim(coalesce(p_slot_id, ''))::uuid
    for update;
  exception
    when invalid_text_representation then
      raise exception 'Ca học không hợp lệ.';
  end;

  if v_slot.id is null then
    raise exception 'Không tìm thấy ca học.';
  end if;
  if v_slot.status <> 'open' then
    raise exception 'Ca học này đã đóng đăng ký.';
  end if;
  if v_slot.starts_at <= now() then
    raise exception 'Ca học này đã bắt đầu hoặc đã kết thúc.';
  end if;

  select
    (select count(*) from public.student_training_sessions where slot_id = v_slot.id)
    + (select count(*) from public.student_training_requests where slot_id = v_slot.id and status = 'pending')
  into v_reserved;

  if v_reserved >= v_slot.capacity then
    raise exception 'Ca học này đã đủ số lượng đăng ký.';
  end if;

  v_ends_at := v_slot.starts_at + make_interval(mins => v_slot.duration_minutes);
  if exists (
    select 1
    from public.student_training_sessions session
    left join public.training_slots other_slot on other_slot.id = session.slot_id
    where session.student_id = v_student_id
      and coalesce(other_slot.starts_at, session.starts_at) < v_ends_at
      and coalesce(
        other_slot.starts_at + make_interval(mins => other_slot.duration_minutes),
        session.starts_at + interval '120 minutes'
      ) > v_slot.starts_at
  ) then
    raise exception 'Anh/chị đã có lịch học khác trùng thời gian với ca này.';
  end if;

  insert into public.student_training_requests(
    student_id, request_type, requested_at, note, slot_id
  )
  values (
    v_student_id, v_slot.session_type, v_slot.starts_at,
    btrim(coalesce(p_note, '')), v_slot.id
  )
  returning id into v_id;

  return v_id::text;
exception
  when unique_violation then
    raise exception 'Anh/chị đã gửi yêu cầu cho ca học này.';
end;
$$;

create or replace function public.app_admin_review_training_request_slot(
  p_token text,
  p_request_id text,
  p_decision text,
  p_slot_id text,
  p_admin_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_request public.student_training_requests;
  v_slot public.training_slots;
  v_slot_id uuid;
  v_booked integer;
  v_session_id uuid;
  v_ends_at timestamptz;
  v_session_note text;
begin
  perform public.app_require_admin(p_token);

  if coalesce(p_decision, '') not in ('approved', 'rejected') then
    raise exception 'Quyết định duyệt không hợp lệ.';
  end if;

  select *
  into v_request
  from public.student_training_requests
  where id::text = btrim(coalesce(p_request_id, ''))
  for update;

  if v_request.id is null then
    raise exception 'Không tìm thấy yêu cầu đăng ký.';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'Yêu cầu này đã được xử lý.';
  end if;

  if p_decision = 'approved' then
    begin
      v_slot_id := coalesce(
        nullif(btrim(coalesce(p_slot_id, '')), '')::uuid,
        v_request.slot_id
      );
    exception
      when invalid_text_representation then
        raise exception 'Ca học không hợp lệ.';
    end;

    select *
    into v_slot
    from public.training_slots
    where id = v_slot_id
    for update;

    if v_slot.id is null then
      raise exception 'Vui lòng chọn ca học để duyệt.';
    end if;
    if v_slot.status <> 'open' then
      raise exception 'Ca học đã đóng đăng ký.';
    end if;
    if v_slot.starts_at <= now() then
      raise exception 'Ca học đã bắt đầu hoặc đã kết thúc.';
    end if;
    if v_slot.session_type <> v_request.request_type then
      raise exception 'Nội dung ca học không phù hợp với yêu cầu.';
    end if;

    select count(*)::integer
    into v_booked
    from public.student_training_sessions
    where slot_id = v_slot.id;

    if v_booked >= v_slot.capacity then
      raise exception 'Ca học đã đủ % học viên.', v_slot.capacity;
    end if;

    v_ends_at := v_slot.starts_at + make_interval(mins => v_slot.duration_minutes);
    if exists (
      select 1
      from public.student_training_sessions session
      left join public.training_slots other_slot on other_slot.id = session.slot_id
      where session.student_id = v_request.student_id
        and coalesce(other_slot.starts_at, session.starts_at) < v_ends_at
        and coalesce(
          other_slot.starts_at + make_interval(mins => other_slot.duration_minutes),
          session.starts_at + interval '120 minutes'
        ) > v_slot.starts_at
    ) then
      raise exception 'Học viên đã có lịch khác trùng thời gian với ca này.';
    end if;

    v_session_note := concat_ws(
      ' · ',
      nullif(btrim(coalesce(v_request.note, '')), ''),
      nullif('Admin: ' || btrim(coalesce(p_admin_note, '')), 'Admin: ')
    );

    insert into public.student_training_sessions(
      student_id, session_type, starts_at, location, note, slot_id
    )
    values (
      v_request.student_id, v_slot.session_type, v_slot.starts_at,
      v_slot.location, v_session_note, v_slot.id
    )
    returning id into v_session_id;
  end if;

  update public.student_training_requests
  set status = p_decision,
      slot_id = coalesce(v_slot_id, slot_id),
      admin_note = btrim(coalesce(p_admin_note, '')),
      approved_session_id = v_session_id,
      reviewed_at = now(),
      updated_at = now()
  where id = v_request.id;

  return jsonb_build_object(
    'id', v_request.id,
    'status', p_decision,
    'slot_id', coalesce(v_slot_id, v_request.slot_id),
    'approved_session_id', v_session_id
  );
exception
  when unique_violation then
    raise exception 'Học viên đã được xếp vào ca học này.';
end;
$$;

create or replace function public.app_list_training_requests(
  p_token text,
  p_student_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_account_kind text;
  v_student_id text;
begin
  begin
    v_me := public.app_me(p_token);
    v_account_kind := 'manager';
  exception
    when others then
      v_me := public.app_student_me(p_token);
      v_account_kind := 'student';
      v_student_id := v_me->>'student_id';
  end;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', request.id,
        'student_id', request.student_id,
        'request_type', request.request_type,
        'requested_at', request.requested_at,
        'note', request.note,
        'status', request.status,
        'admin_note', request.admin_note,
        'approved_session_id', request.approved_session_id,
        'slot_id', request.slot_id,
        'created_at', request.created_at,
        'updated_at', request.updated_at,
        'reviewed_at', request.reviewed_at,
        'student_name', student.name,
        'student_code', student.student_code,
        'slot_starts_at', slot.starts_at,
        'slot_duration_minutes', slot.duration_minutes,
        'slot_location', slot.location,
        'slot_instructor_name', slot.instructor_name,
        'slot_vehicle_plate', slot.vehicle_plate,
        'slot_capacity', slot.capacity,
        'slot_status', slot.status
      )
      order by
        case when request.status = 'pending' then 0 else 1 end,
        request.created_at desc
    )
    from public.student_training_requests request
    join public.students student on student.id = request.student_id
    left join public.training_slots slot on slot.id = request.slot_id
    where (
      v_account_kind = 'student'
      and request.student_id::text = v_student_id
    ) or (
      v_account_kind = 'manager'
      and (
        coalesce(v_me->>'role', '') = 'admin'
        or student.owner_id::text = v_me->>'id'
      )
      and (
        nullif(btrim(coalesce(p_student_id, '')), '') is null
        or request.student_id::text = btrim(p_student_id)
      )
    )
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_list_training_sessions(
  p_token text,
  p_student_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_account_kind text;
  v_student_id text;
begin
  begin
    v_me := public.app_me(p_token);
    v_account_kind := 'manager';
  exception
    when others then
      v_me := public.app_student_me(p_token);
      v_account_kind := 'student';
      v_student_id := v_me->>'student_id';
  end;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', session.id,
        'student_id', session.student_id,
        'session_type', session.session_type,
        'starts_at', session.starts_at,
        'location', session.location,
        'note', session.note,
        'slot_id', session.slot_id,
        'duration_minutes', coalesce(slot.duration_minutes, 120),
        'instructor_name', coalesce(slot.instructor_name, ''),
        'vehicle_plate', coalesce(slot.vehicle_plate, ''),
        'slot_capacity', slot.capacity,
        'slot_status', slot.status,
        'created_at', session.created_at,
        'updated_at', session.updated_at
      )
      order by session.starts_at, session.created_at
    )
    from public.student_training_sessions session
    join public.students student on student.id = session.student_id
    left join public.training_slots slot on slot.id = session.slot_id
    where (
      v_account_kind = 'student'
      and session.student_id::text = v_student_id
    ) or (
      v_account_kind = 'manager'
      and (
        coalesce(v_me->>'role', '') = 'admin'
        or student.owner_id::text = v_me->>'id'
      )
      and (
        nullif(btrim(coalesce(p_student_id, '')), '') is null
        or session.student_id::text = btrim(p_student_id)
      )
    )
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.app_list_training_slots(text,text) from public;
revoke all on function public.app_admin_save_training_slot(text,text,text,text,integer,text,text,text,integer,text,text) from public;
revoke all on function public.app_admin_delete_training_slot(text,text) from public;
revoke all on function public.app_student_create_training_request_slot(text,text,text) from public;
revoke all on function public.app_admin_review_training_request_slot(text,text,text,text,text) from public;

grant execute on function public.app_list_training_slots(text,text) to anon, authenticated;
grant execute on function public.app_admin_save_training_slot(text,text,text,text,integer,text,text,text,integer,text,text) to anon, authenticated;
grant execute on function public.app_admin_delete_training_slot(text,text) to anon, authenticated;
grant execute on function public.app_student_create_training_request_slot(text,text,text) to anon, authenticated;
grant execute on function public.app_admin_review_training_request_slot(text,text,text,text,text) to anon, authenticated;

select pg_notify('pgrst', 'reload schema');

commit;

select
  to_regclass('public.training_slots') as training_slots,
  to_regprocedure('public.app_list_training_slots(text,text)') as list_slots,
  to_regprocedure('public.app_admin_save_training_slot(text,text,text,text,integer,text,text,text,integer,text,text)') as save_slot,
  to_regprocedure('public.app_student_create_training_request_slot(text,text,text)') as student_request_slot,
  to_regprocedure('public.app_admin_review_training_request_slot(text,text,text,text,text)') as review_request_slot;
