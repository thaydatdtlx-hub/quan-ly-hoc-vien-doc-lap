-- ============================================================
-- HỌC VIÊN ĐĂNG KÝ LỊCH THỰC HÀNH - ADMIN DUYỆT
-- Yêu cầu: đã chạy CAP-NHAT-NHIEU-BUOI-THUC-HANH.sql
-- Chạy toàn bộ file này 1 lần trong Supabase SQL Editor.
-- ============================================================

begin;

create table if not exists public.student_training_requests (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  request_type text not null check (request_type in ('familiar', 'practice')),
  requested_at timestamptz not null,
  note text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  admin_note text not null default '',
  approved_session_id uuid references public.student_training_sessions(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create index if not exists student_training_requests_student_idx
  on public.student_training_requests(student_id, created_at desc);

create index if not exists student_training_requests_status_idx
  on public.student_training_requests(status, created_at desc);

create unique index if not exists student_training_requests_pending_unique
  on public.student_training_requests(student_id, request_type, requested_at)
  where status = 'pending';

alter table public.student_training_requests enable row level security;
revoke all on public.student_training_requests from anon, authenticated;

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
        'id', r.id,
        'student_id', r.student_id,
        'request_type', r.request_type,
        'requested_at', r.requested_at,
        'note', r.note,
        'status', r.status,
        'admin_note', r.admin_note,
        'approved_session_id', r.approved_session_id,
        'created_at', r.created_at,
        'updated_at', r.updated_at,
        'reviewed_at', r.reviewed_at,
        'student_name', s.name,
        'student_code', s.student_code
      )
      order by
        case when r.status = 'pending' then 0 else 1 end,
        r.created_at desc
    )
    from public.student_training_requests r
    join public.students s on s.id = r.student_id
    where (
      v_account_kind = 'student'
      and r.student_id::text = v_student_id
    ) or (
      v_account_kind = 'manager'
      and (
        coalesce(v_me->>'role', '') = 'admin'
        or s.owner_id::text = v_me->>'id'
      )
      and (
        nullif(btrim(coalesce(p_student_id, '')), '') is null
        or r.student_id::text = btrim(p_student_id)
      )
    )
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_student_create_training_request(
  p_token text,
  p_request_type text,
  p_requested_at text,
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
  v_requested_at timestamptz;
  v_id uuid;
begin
  v_me := public.app_student_me(p_token);

  if coalesce(p_request_type, '') not in ('familiar', 'practice') then
    raise exception 'Nội dung đăng ký không hợp lệ.';
  end if;

  begin
    v_student_id := (v_me->>'student_id')::uuid;
    v_requested_at := btrim(coalesce(p_requested_at, ''))::timestamptz;
  exception
    when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
      raise exception 'Ngày và giờ mong muốn không hợp lệ.';
  end;

  if v_requested_at <= now() then
    raise exception 'Vui lòng chọn thời gian trong tương lai.';
  end if;

  insert into public.student_training_requests(
    student_id, request_type, requested_at, note
  )
  values (
    v_student_id,
    p_request_type,
    v_requested_at,
    btrim(coalesce(p_note, ''))
  )
  returning id into v_id;

  return v_id::text;
exception
  when unique_violation then
    raise exception 'Anh/chị đã gửi yêu cầu trùng nội dung và thời gian này.';
end;
$$;

create or replace function public.app_student_cancel_training_request(
  p_token text,
  p_request_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
begin
  v_me := public.app_student_me(p_token);

  update public.student_training_requests
  set status = 'cancelled',
      updated_at = now()
  where id::text = btrim(coalesce(p_request_id, ''))
    and student_id::text = v_me->>'student_id'
    and status = 'pending';

  if not found then
    raise exception 'Không tìm thấy yêu cầu đang chờ duyệt.';
  end if;

  return true;
end;
$$;

create or replace function public.app_admin_review_training_request(
  p_token text,
  p_request_id text,
  p_decision text,
  p_starts_at text,
  p_location text,
  p_admin_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_request public.student_training_requests;
  v_starts_at timestamptz;
  v_session_id uuid;
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
      v_starts_at := btrim(coalesce(p_starts_at, ''))::timestamptz;
    exception
      when invalid_datetime_format or datetime_field_overflow then
        raise exception 'Ngày và giờ học chính thức không hợp lệ.';
    end;

    v_session_note := btrim(coalesce(v_request.note, ''));
    if btrim(coalesce(p_admin_note, '')) <> '' then
      v_session_note := concat_ws(
        ' · ',
        nullif(v_session_note, ''),
        'Admin: ' || btrim(p_admin_note)
      );
    end if;

    insert into public.student_training_sessions(
      student_id, session_type, starts_at, location, note
    )
    values (
      v_request.student_id,
      v_request.request_type,
      v_starts_at,
      btrim(coalesce(p_location, '')),
      v_session_note
    )
    returning id into v_session_id;
  end if;

  update public.student_training_requests
  set status = p_decision,
      admin_note = btrim(coalesce(p_admin_note, '')),
      approved_session_id = v_session_id,
      reviewed_at = now(),
      updated_at = now()
  where id = v_request.id;

  return jsonb_build_object(
    'id', v_request.id,
    'status', p_decision,
    'approved_session_id', v_session_id
  );
end;
$$;

revoke all on function public.app_list_training_requests(text,text) from public;
revoke all on function public.app_student_create_training_request(text,text,text,text) from public;
revoke all on function public.app_student_cancel_training_request(text,text) from public;
revoke all on function public.app_admin_review_training_request(text,text,text,text,text,text) from public;

grant execute on function public.app_list_training_requests(text,text) to anon, authenticated;
grant execute on function public.app_student_create_training_request(text,text,text,text) to anon, authenticated;
grant execute on function public.app_student_cancel_training_request(text,text) to anon, authenticated;
grant execute on function public.app_admin_review_training_request(text,text,text,text,text,text) to anon, authenticated;

select pg_notify('pgrst', 'reload schema');

commit;

select
  to_regclass('public.student_training_requests') as training_requests,
  to_regprocedure('public.app_list_training_requests(text,text)') as list_requests,
  to_regprocedure('public.app_student_create_training_request(text,text,text,text)') as create_request,
  to_regprocedure('public.app_admin_review_training_request(text,text,text,text,text,text)') as review_request;
