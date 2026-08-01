-- BƯỚC 4 + 5: ĐIỂM DANH, GIỜ HỌC THỰC TẾ VÀ BÁO CÁO ADMIN
-- Chạy toàn bộ file này trong Supabase SQL Editor đúng 1 lần.

begin;

create table if not exists public.app_attendance_records (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  session_date date not null default current_date,
  session_type text not null default 'theory'
    check (session_type in ('theory','cabin','dat_auto','dat_manual','dat_practice','practice','familiar','graduation','other')),
  status text not null default 'present'
    check (status in ('present','absent','excused')),
  started_at time,
  ended_at time,
  actual_minutes integer not null default 0 check (actual_minutes between 0 and 1440),
  note text not null default '',
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ended_at is null or started_at is null or ended_at >= started_at),
  check (status = 'present' or actual_minutes = 0)
);

create index if not exists app_attendance_student_date_idx
  on public.app_attendance_records(student_id, session_date desc);
create index if not exists app_attendance_date_type_idx
  on public.app_attendance_records(session_date desc, session_type);

alter table public.app_attendance_records enable row level security;
revoke all on public.app_attendance_records from anon, authenticated;

create or replace function public.app_list_attendance_records(
  p_token text,
  p_student_id text default null,
  p_from date default null,
  p_to date default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  perform public.app_require_admin(p_token);
  if p_from is not null and p_to is not null and p_to < p_from then
    raise exception 'Ngày kết thúc không được trước ngày bắt đầu.';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(item) order by item.session_date desc, item.started_at desc nulls last, item.created_at desc)
    from (
      select record.id, record.student_id, student.student_code,
        student.name as student_name, student.license_class, student.course,
        record.session_date, record.session_type, record.status,
        record.started_at, record.ended_at, record.actual_minutes, record.note,
        record.created_at, record.updated_at, creator.username as created_by_username
      from public.app_attendance_records record
      join public.students student on student.id = record.student_id
      left join public.app_users creator on creator.id = record.created_by
      where (nullif(btrim(coalesce(p_student_id, '')), '') is null or record.student_id::text = btrim(p_student_id))
        and (p_from is null or record.session_date >= p_from)
        and (p_to is null or record.session_date <= p_to)
      order by record.session_date desc, record.started_at desc nulls last, record.created_at desc
      limit 5000
    ) item
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_student_list_attendance(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
begin
  v_me := public.app_student_me(p_token);
  if coalesce(v_me->>'role', '') <> 'student' then
    raise exception 'Tài khoản không có quyền xem điểm danh.';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(item) order by item.session_date desc, item.started_at desc nulls last)
    from (
      select record.id, record.student_id, record.session_date, record.session_type,
        record.status, record.started_at, record.ended_at, record.actual_minutes, record.note
      from public.app_attendance_records record
      where record.student_id::text = v_me->>'student_id'
      order by record.session_date desc, record.started_at desc nulls last
      limit 1000
    ) item
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_save_attendance_record(
  p_token text,
  p_record_id text,
  p_student_id text,
  p_session_date date,
  p_session_type text,
  p_status text,
  p_started_at time,
  p_ended_at time,
  p_actual_minutes integer,
  p_note text default ''
)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_id uuid;
  v_student public.students;
  v_minutes integer;
begin
  v_me := public.app_require_admin(p_token);
  select * into v_student from public.students
  where id::text = btrim(coalesce(p_student_id, '')) and deleted_at is null;
  if v_student.id is null then raise exception 'Không tìm thấy hồ sơ học viên.'; end if;
  if coalesce(p_session_type, '') not in ('theory','cabin','dat_auto','dat_manual','dat_practice','practice','familiar','graduation','other') then raise exception 'Nội dung đào tạo không hợp lệ.'; end if;
  if coalesce(p_status, '') not in ('present','absent','excused') then raise exception 'Trạng thái điểm danh không hợp lệ.'; end if;
  if p_session_date is null then raise exception 'Vui lòng chọn ngày học.'; end if;
  if p_started_at is not null and p_ended_at is not null and p_ended_at < p_started_at then raise exception 'Giờ kết thúc không được trước giờ bắt đầu.'; end if;
  v_minutes := case when p_status = 'present' then greatest(0, least(coalesce(p_actual_minutes, 0), 1440)) else 0 end;
  if p_status = 'present' and v_minutes <= 0 then raise exception 'Buổi có mặt phải có số giờ học thực tế lớn hơn 0.'; end if;

  if nullif(btrim(coalesce(p_record_id, '')), '') is null then
    insert into public.app_attendance_records(student_id,session_date,session_type,status,started_at,ended_at,actual_minutes,note,created_by)
    values(v_student.id,p_session_date,p_session_type,p_status,p_started_at,p_ended_at,v_minutes,left(btrim(coalesce(p_note,'')),500),(v_me->>'id')::uuid)
    returning id into v_id;
  else
    update public.app_attendance_records set student_id=v_student.id,session_date=p_session_date,
      session_type=p_session_type,status=p_status,started_at=p_started_at,ended_at=p_ended_at,
      actual_minutes=v_minutes,note=left(btrim(coalesce(p_note,'')),500),updated_at=now()
    where id::text=btrim(p_record_id) returning id into v_id;
    if v_id is null then raise exception 'Không tìm thấy bản điểm danh.'; end if;
  end if;

  insert into public.app_audit_logs(actor_id,actor_username,actor_role,action,entity_type,entity_id,entity_label,details)
  values((v_me->>'id')::uuid,v_me->>'username',v_me->>'role',case when nullif(btrim(coalesce(p_record_id,'')),'') is null then 'attendance_created' else 'attendance_updated' end,
    'attendance',v_id::text,v_student.name,jsonb_build_object('student_id',v_student.id,'session_date',p_session_date,'session_type',p_session_type,'status',p_status,'actual_minutes',v_minutes));
  return v_id::text;
end;
$$;

create or replace function public.app_delete_attendance_record(p_token text,p_record_id text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_record public.app_attendance_records;
  v_student_name text;
begin
  v_me := public.app_require_admin(p_token);
  select * into v_record from public.app_attendance_records where id::text=btrim(coalesce(p_record_id,''));
  if v_record.id is null then raise exception 'Không tìm thấy bản điểm danh.'; end if;
  select name into v_student_name from public.students where id=v_record.student_id;
  delete from public.app_attendance_records where id=v_record.id;
  insert into public.app_audit_logs(actor_id,actor_username,actor_role,action,entity_type,entity_id,entity_label,details)
  values((v_me->>'id')::uuid,v_me->>'username',v_me->>'role','attendance_deleted','attendance',v_record.id::text,coalesce(v_student_name,''),jsonb_build_object('student_id',v_record.student_id,'session_date',v_record.session_date,'actual_minutes',v_record.actual_minutes));
  return true;
end;
$$;

create or replace function public.app_admin_attendance_report(
  p_token text,
  p_from date default null,
  p_to date default null,
  p_owner_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  perform public.app_require_admin(p_token);
  if p_from is not null and p_to is not null and p_to < p_from then raise exception 'Ngày kết thúc không được trước ngày bắt đầu.'; end if;
  return coalesce((
    select jsonb_agg(to_jsonb(report_row) order by report_row.name)
    from (
      select student.id as student_id,student.student_code,student.name,student.license_class,student.course,
        student.tuition_total,student.paid,greatest(0,student.tuition_total-student.paid) as debt,
        count(record.id)::integer as session_count,
        count(record.id) filter(where record.status='present')::integer as present_count,
        count(record.id) filter(where record.status='absent')::integer as absent_count,
        count(record.id) filter(where record.status='excused')::integer as excused_count,
        coalesce(sum(record.actual_minutes) filter(where record.status='present'),0)::integer as actual_minutes,
        case when count(record.id)=0 then 0 else round(100.0*(count(record.id) filter(where record.status='present'))/nullif(count(record.id),0),1) end as attendance_rate
      from public.students student
      left join public.app_attendance_records record on record.student_id=student.id
        and (p_from is null or record.session_date>=p_from) and (p_to is null or record.session_date<=p_to)
      where student.deleted_at is null and (nullif(btrim(coalesce(p_owner_id,'')),'') is null or student.owner_id::text=btrim(p_owner_id))
      group by student.id
    ) report_row
  ),'[]'::jsonb);
end;
$$;

revoke all on function public.app_list_attendance_records(text,text,date,date) from public;
revoke all on function public.app_student_list_attendance(text) from public;
revoke all on function public.app_save_attendance_record(text,text,text,date,text,text,time,time,integer,text) from public;
revoke all on function public.app_delete_attendance_record(text,text) from public;
revoke all on function public.app_admin_attendance_report(text,date,date,text) from public;
grant execute on function public.app_list_attendance_records(text,text,date,date) to anon,authenticated;
grant execute on function public.app_student_list_attendance(text) to anon,authenticated;
grant execute on function public.app_save_attendance_record(text,text,text,date,text,text,time,time,integer,text) to anon,authenticated;
grant execute on function public.app_delete_attendance_record(text,text) to anon,authenticated;
grant execute on function public.app_admin_attendance_report(text,date,date,text) to anon,authenticated;

commit;

select to_regclass('public.app_attendance_records') as attendance_table,
  to_regprocedure('public.app_save_attendance_record(text,text,text,date,text,text,time,time,integer,text)') as save_attendance,
  to_regprocedure('public.app_admin_attendance_report(text,date,date,text)') as admin_report;
