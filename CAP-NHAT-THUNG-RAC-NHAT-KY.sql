-- THÙNG RÁC HỌC VIÊN VÀ NHẬT KÝ THAO TÁC
-- Chạy toàn bộ file này trong Supabase SQL Editor đúng 1 lần.

begin;

alter table public.students
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.app_users(id) on delete set null,
  add column if not exists deleted_account_was_active boolean;

create index if not exists students_deleted_at_idx
  on public.students(deleted_at);

create table if not exists public.app_audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.app_users(id) on delete set null,
  actor_username text not null default '',
  actor_role text not null default '',
  action text not null,
  entity_type text not null default '',
  entity_id text not null default '',
  entity_label text not null default '',
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists app_audit_logs_created_at_idx
  on public.app_audit_logs(created_at desc);
create index if not exists app_audit_logs_actor_idx
  on public.app_audit_logs(actor_id, created_at desc);
create index if not exists app_audit_logs_entity_idx
  on public.app_audit_logs(entity_type, entity_id, created_at desc);

alter table public.app_audit_logs enable row level security;
revoke all on public.app_audit_logs from anon, authenticated;

create or replace function public.app_record_audit(
  p_token text,
  p_action text,
  p_entity_type text,
  p_entity_id text,
  p_entity_label text,
  p_details jsonb default '{}'::jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
begin
  v_me := public.app_me(p_token);

  if btrim(coalesce(p_action, '')) = '' then
    raise exception 'Thiếu loại thao tác cần ghi nhận.';
  end if;

  insert into public.app_audit_logs(
    actor_id, actor_username, actor_role, action,
    entity_type, entity_id, entity_label, details
  ) values (
    nullif(v_me->>'id', '')::uuid,
    left(coalesce(v_me->>'username', ''), 80),
    left(coalesce(v_me->>'role', ''), 30),
    left(btrim(p_action), 80),
    left(btrim(coalesce(p_entity_type, '')), 60),
    left(btrim(coalesce(p_entity_id, '')), 120),
    left(btrim(coalesce(p_entity_label, '')), 180),
    coalesce(p_details, '{}'::jsonb)
  );

  return true;
end;
$$;

create or replace function public.app_list_audit_logs(
  p_token text,
  p_limit integer default 200
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  perform public.app_require_admin(p_token);

  return coalesce((
    select jsonb_agg(to_jsonb(log_row) order by log_row.created_at desc)
    from (
      select
        log.id,
        log.actor_username,
        log.actor_role,
        log.action,
        log.entity_type,
        log.entity_id,
        log.entity_label,
        log.details,
        log.created_at
      from public.app_audit_logs log
      order by log.created_at desc
      limit greatest(1, least(coalesce(p_limit, 200), 500))
    ) log_row
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_list_deleted_students(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  perform public.app_require_admin(p_token);

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', student.id,
        'student_code', student.student_code,
        'name', student.name,
        'phone', student.phone,
        'license_class', student.license_class,
        'course', student.course,
        'tuition_total', student.tuition_total,
        'paid', student.paid,
        'deleted_at', student.deleted_at,
        'owner_username', owner_user.username,
        'deleted_by_username', deleted_user.username,
        'account_username', account.username,
        'account_active', coalesce(account.active, false)
      )
      order by student.deleted_at desc
    )
    from public.students student
    join public.app_users owner_user on owner_user.id = student.owner_id
    left join public.app_users deleted_user on deleted_user.id = student.deleted_by
    left join public.app_student_accounts account on account.student_id = student.id::text
    where student.deleted_at is not null
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_list_students(
  p_token text,
  p_owner_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
begin
  v_me := public.app_me(p_token);

  return coalesce((
    select jsonb_agg(
      to_jsonb(student)
      || jsonb_build_object('owner_username', owner_user.username)
      order by student.created_at desc, student.student_code desc
    )
    from public.students student
    join public.app_users owner_user on owner_user.id = student.owner_id
    where student.deleted_at is null
      and (
        (
          coalesce(v_me->>'role', '') = 'admin'
          and (
            nullif(btrim(coalesce(p_owner_id, '')), '') is null
            or student.owner_id::text = btrim(p_owner_id)
          )
        )
        or (
          coalesce(v_me->>'role', '') <> 'admin'
          and student.owner_id::text = v_me->>'id'
        )
      )
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_delete_student(
  p_token text,
  p_student_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_student public.students;
  v_account_active boolean;
begin
  v_me := public.app_me(p_token);

  select * into v_student
  from public.students
  where id::text = btrim(coalesce(p_student_id, ''))
    and deleted_at is null;

  if v_student.id is null then
    raise exception 'Không tìm thấy hồ sơ học viên.';
  end if;
  if coalesce(v_me->>'role', '') <> 'admin'
     and v_student.owner_id::text <> v_me->>'id' then
    raise exception 'Tài khoản không có quyền xóa học viên này.';
  end if;

  select active into v_account_active
  from public.app_student_accounts
  where student_id = v_student.id::text;

  update public.students
  set deleted_at = now(),
      deleted_by = nullif(v_me->>'id', '')::uuid,
      deleted_account_was_active = v_account_active,
      updated_at = now()
  where id = v_student.id;

  update public.app_student_accounts
  set active = false, updated_at = now()
  where student_id = v_student.id::text;

  delete from public.app_student_sessions session
  using public.app_student_accounts account
  where session.account_id = account.id
    and account.student_id = v_student.id::text;

  perform public.app_record_audit(
    p_token,
    'student_moved_to_trash',
    'student',
    v_student.id::text,
    v_student.name,
    jsonb_build_object('student_code', v_student.student_code)
  );

  return true;
end;
$$;

create or replace function public.app_restore_student(
  p_token text,
  p_student_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_student public.students;
begin
  perform public.app_require_admin(p_token);

  select * into v_student
  from public.students
  where id::text = btrim(coalesce(p_student_id, ''))
    and deleted_at is not null;

  if v_student.id is null then
    raise exception 'Không tìm thấy học viên trong thùng rác.';
  end if;

  update public.students
  set deleted_at = null,
      deleted_by = null,
      deleted_account_was_active = null,
      updated_at = now()
  where id = v_student.id;

  update public.app_student_accounts
  set active = coalesce(v_student.deleted_account_was_active, false),
      updated_at = now()
  where student_id = v_student.id::text;

  perform public.app_record_audit(
    p_token,
    'student_restored',
    'student',
    v_student.id::text,
    v_student.name,
    jsonb_build_object('student_code', v_student.student_code)
  );

  return true;
end;
$$;

create or replace function public.app_permanently_delete_student(
  p_token text,
  p_student_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_student public.students;
begin
  perform public.app_require_admin(p_token);

  select * into v_student
  from public.students
  where id::text = btrim(coalesce(p_student_id, ''))
    and deleted_at is not null;

  if v_student.id is null then
    raise exception 'Chỉ có thể xóa vĩnh viễn học viên đang ở trong thùng rác.';
  end if;

  perform public.app_record_audit(
    p_token,
    'student_deleted_permanently',
    'student',
    v_student.id::text,
    v_student.name,
    jsonb_build_object('student_code', v_student.student_code)
  );

  delete from public.app_student_accounts
  where student_id = v_student.id::text;

  delete from public.students
  where id = v_student.id;

  return true;
end;
$$;

create or replace function public.app_admin_list_theory_progress(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  perform public.app_require_admin(p_token);

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'student_id', student.id,
        'student_name', student.name,
        'student_code', student.student_code,
        'license_class', student.license_class,
        'account_username', account.username,
        'account_active', coalesce(account.active, false),
        'answered_count', coalesce(progress.answered_count, 0),
        'correct_count', coalesce(progress.correct_count, 0),
        'wrong_count', coalesce(progress.wrong_count, 0),
        'bookmarks_count', coalesce(progress.bookmarks_count, 0),
        'last_question_id', coalesce(progress.last_question_id, 1),
        'last_activity', progress.last_activity,
        'exam_count', coalesce(exam.exam_count, 0),
        'passed_exam_count', coalesce(exam.passed_exam_count, 0),
        'best_score', exam.best_score,
        'best_total', exam.best_total,
        'latest_exam', exam.latest_exam
      )
      order by progress.last_activity desc nulls last, lower(student.name)
    )
    from public.students student
    left join public.app_student_accounts account on account.student_id = student.id::text
    left join public.app_student_theory_progress progress on progress.student_id = student.id
    left join lateral (
      select
        count(*)::integer as exam_count,
        (count(*) filter (where attempt.passed))::integer as passed_exam_count,
        (
          select best_attempt.score
          from public.app_student_exam_attempts best_attempt
          where best_attempt.student_id = student.id
          order by (best_attempt.score::numeric / nullif(best_attempt.total, 0)) desc, best_attempt.submitted_at desc
          limit 1
        ) as best_score,
        (
          select best_attempt.total
          from public.app_student_exam_attempts best_attempt
          where best_attempt.student_id = student.id
          order by (best_attempt.score::numeric / nullif(best_attempt.total, 0)) desc, best_attempt.submitted_at desc
          limit 1
        ) as best_total,
        (
          select jsonb_build_object(
            'license_class', latest_attempt.license_class,
            'score', latest_attempt.score,
            'total', latest_attempt.total,
            'passed', latest_attempt.passed,
            'critical_correct', latest_attempt.critical_correct,
            'elapsed_seconds', latest_attempt.elapsed_seconds,
            'submitted_at', latest_attempt.submitted_at
          )
          from public.app_student_exam_attempts latest_attempt
          where latest_attempt.student_id = student.id
          order by latest_attempt.submitted_at desc
          limit 1
        ) as latest_exam
      from public.app_student_exam_attempts attempt
      where attempt.student_id = student.id
    ) exam on true
    where student.deleted_at is null
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.app_record_audit(text,text,text,text,text,jsonb) from public;
revoke all on function public.app_list_audit_logs(text,integer) from public;
revoke all on function public.app_list_deleted_students(text) from public;
revoke all on function public.app_restore_student(text,text) from public;
revoke all on function public.app_permanently_delete_student(text,text) from public;

grant execute on function public.app_record_audit(text,text,text,text,text,jsonb) to anon, authenticated;
grant execute on function public.app_list_audit_logs(text,integer) to anon, authenticated;
grant execute on function public.app_list_deleted_students(text) to anon, authenticated;
grant execute on function public.app_restore_student(text,text) to anon, authenticated;
grant execute on function public.app_permanently_delete_student(text,text) to anon, authenticated;

commit;

select
  to_regclass('public.app_audit_logs') as audit_logs,
  to_regprocedure('public.app_list_deleted_students(text)') as list_deleted_students,
  to_regprocedure('public.app_restore_student(text,text)') as restore_student,
  to_regprocedure('public.app_permanently_delete_student(text,text)') as permanently_delete_student,
  to_regprocedure('public.app_list_audit_logs(text,integer)') as list_audit_logs;
