-- ============================================================
-- NHIỀU BUỔI LÀM QUEN XE / HỌC SA HÌNH CHO MỖI HỌC VIÊN
-- Chạy toàn bộ file này 1 lần trong Supabase SQL Editor.
-- ============================================================

begin;

create table if not exists public.student_training_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  session_type text not null check (session_type in ('familiar', 'practice')),
  starts_at timestamptz not null,
  location text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_training_sessions_student_date_idx
  on public.student_training_sessions(student_id, starts_at);

create index if not exists student_training_sessions_type_date_idx
  on public.student_training_sessions(session_type, starts_at);

alter table public.student_training_sessions enable row level security;
revoke all on public.student_training_sessions from anon, authenticated;

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
        'id', ts.id,
        'student_id', ts.student_id,
        'session_type', ts.session_type,
        'starts_at', ts.starts_at,
        'location', ts.location,
        'note', ts.note,
        'created_at', ts.created_at,
        'updated_at', ts.updated_at
      )
      order by ts.starts_at, ts.created_at
    )
    from public.student_training_sessions ts
    join public.students s on s.id = ts.student_id
    where (
      v_account_kind = 'student'
      and ts.student_id::text = v_student_id
    ) or (
      v_account_kind = 'manager'
      and (
        coalesce(v_me->>'role', '') = 'admin'
        or s.owner_id::text = v_me->>'id'
      )
      and (
        nullif(btrim(coalesce(p_student_id, '')), '') is null
        or ts.student_id::text = btrim(p_student_id)
      )
    )
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_admin_save_training_session(
  p_token text,
  p_session_id text,
  p_student_id text,
  p_session_type text,
  p_starts_at text,
  p_location text,
  p_note text
)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
  v_student_id uuid;
  v_starts_at timestamptz;
begin
  perform public.app_require_admin(p_token);

  if coalesce(p_session_type, '') not in ('familiar', 'practice') then
    raise exception 'Nội dung chỉ có thể là Làm quen xe hoặc Học sa hình.';
  end if;

  begin
    v_student_id := btrim(coalesce(p_student_id, ''))::uuid;
  exception
    when invalid_text_representation then
      raise exception 'Học viên không hợp lệ.';
  end;

  if not exists (select 1 from public.students where id = v_student_id) then
    raise exception 'Không tìm thấy hồ sơ học viên.';
  end if;

  begin
    v_starts_at := btrim(coalesce(p_starts_at, ''))::timestamptz;
  exception
    when invalid_datetime_format or datetime_field_overflow then
      raise exception 'Ngày và giờ đào tạo không hợp lệ.';
  end;

  if nullif(btrim(coalesce(p_session_id, '')), '') is null then
    insert into public.student_training_sessions(
      student_id, session_type, starts_at, location, note
    )
    values (
      v_student_id,
      p_session_type,
      v_starts_at,
      btrim(coalesce(p_location, '')),
      btrim(coalesce(p_note, ''))
    )
    returning id into v_id;
  else
    begin
      v_id := btrim(p_session_id)::uuid;
    exception
      when invalid_text_representation then
        raise exception 'Buổi đào tạo không hợp lệ.';
    end;

    update public.student_training_sessions
    set student_id = v_student_id,
        session_type = p_session_type,
        starts_at = v_starts_at,
        location = btrim(coalesce(p_location, '')),
        note = btrim(coalesce(p_note, '')),
        updated_at = now()
    where id = v_id;

    if not found then
      raise exception 'Không tìm thấy buổi đào tạo.';
    end if;
  end if;

  return v_id::text;
end;
$$;

create or replace function public.app_admin_delete_training_session(
  p_token text,
  p_session_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
begin
  perform public.app_require_admin(p_token);

  begin
    v_id := btrim(coalesce(p_session_id, ''))::uuid;
  exception
    when invalid_text_representation then
      raise exception 'Buổi đào tạo không hợp lệ.';
  end;

  delete from public.student_training_sessions where id = v_id;
  if not found then
    raise exception 'Không tìm thấy buổi đào tạo.';
  end if;

  return true;
end;
$$;

revoke all on function public.app_list_training_sessions(text,text) from public;
revoke all on function public.app_admin_save_training_session(text,text,text,text,text,text,text) from public;
revoke all on function public.app_admin_delete_training_session(text,text) from public;

grant execute on function public.app_list_training_sessions(text,text) to anon, authenticated;
grant execute on function public.app_admin_save_training_session(text,text,text,text,text,text,text) to anon, authenticated;
grant execute on function public.app_admin_delete_training_session(text,text) to anon, authenticated;

select pg_notify('pgrst', 'reload schema');

commit;

select
  to_regclass('public.student_training_sessions') as training_sessions,
  to_regprocedure('public.app_list_training_sessions(text,text)') as list_sessions,
  to_regprocedure('public.app_admin_save_training_session(text,text,text,text,text,text,text)') as save_session,
  to_regprocedure('public.app_admin_delete_training_session(text,text)') as delete_session;
