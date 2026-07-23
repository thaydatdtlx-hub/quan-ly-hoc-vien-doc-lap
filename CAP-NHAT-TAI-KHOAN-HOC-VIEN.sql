-- TÀI KHOẢN HỌC VIÊN RIÊNG BIỆT
-- Chạy toàn bộ file này một lần trong Supabase SQL Editor.
-- Tài khoản học viên dùng bảng phiên đăng nhập riêng và chỉ có quyền đọc
-- đúng hồ sơ được liên kết. Token học viên không dùng được các RPC quản trị.

create extension if not exists pgcrypto;

create table if not exists public.app_student_accounts (
  id uuid primary key default gen_random_uuid(),
  student_id text not null unique,
  username text not null,
  password_hash text not null,
  active boolean not null default true,
  force_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists app_student_accounts_username_lower_key
  on public.app_student_accounts (lower(username));

create table if not exists public.app_student_sessions (
  token_hash bytea primary key,
  account_id uuid not null references public.app_student_accounts(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists app_student_sessions_account_id_idx
  on public.app_student_sessions(account_id);

alter table public.app_student_accounts enable row level security;
alter table public.app_student_sessions enable row level security;
revoke all on public.app_student_accounts from anon, authenticated;
revoke all on public.app_student_sessions from anon, authenticated;

create or replace function public.app_student_admin(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me jsonb;
begin
  v_me := public.app_me(p_token)::jsonb;
  if coalesce(v_me->>'role', '') <> 'admin' then
    raise exception 'Chỉ tài khoản admin được thực hiện thao tác này.';
  end if;
  return v_me;
exception
  when others then
    if sqlerrm = 'Chỉ tài khoản admin được thực hiện thao tác này.' then
      raise;
    end if;
    raise exception 'Phiên quản trị không hợp lệ hoặc đã hết hạn.';
end;
$$;

create or replace function public.app_create_student_account(
  p_token text,
  p_student_id text,
  p_username text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  perform public.app_student_admin(p_token);

  p_student_id := btrim(coalesce(p_student_id, ''));
  p_username := lower(btrim(coalesce(p_username, '')));

  if p_student_id = '' or not exists (
    select 1 from public.students s where s.id::text = p_student_id
  ) then
    raise exception 'Không tìm thấy hồ sơ học viên.';
  end if;
  if p_username !~ '^[a-z0-9._-]{4,40}$' then
    raise exception 'Tên đăng nhập gồm 4–40 ký tự: chữ thường không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.';
  end if;
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Mật khẩu tạm phải có ít nhất 8 ký tự.';
  end if;

  insert into public.app_student_accounts(student_id, username, password_hash)
  values (p_student_id, p_username, crypt(p_password, gen_salt('bf', 12)))
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'username', p_username, 'student_id', p_student_id);
exception
  when unique_violation then
    if exists (select 1 from public.app_student_accounts where student_id = p_student_id) then
      raise exception 'Học viên này đã có tài khoản đăng nhập.';
    end if;
    raise exception 'Tên đăng nhập này đã được sử dụng.';
end;
$$;

create or replace function public.app_list_student_accounts(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.app_student_admin(p_token);
  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', a.id,
        'student_id', a.student_id,
        'username', a.username,
        'active', a.active,
        'force_change_password', a.force_change_password,
        'student_name', s.name,
        'student_code', s.student_code
      )
      order by lower(s.name), lower(a.username)
    )
    from public.app_student_accounts a
    join public.students s on s.id::text = a.student_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_set_student_account_active(
  p_token text,
  p_account_id text,
  p_active boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.app_student_admin(p_token);
  update public.app_student_accounts
  set active = coalesce(p_active, false), updated_at = now()
  where id::text = p_account_id;
  if not found then raise exception 'Không tìm thấy tài khoản học viên.'; end if;
  if not coalesce(p_active, false) then
    delete from public.app_student_sessions where account_id::text = p_account_id;
  end if;
  return true;
end;
$$;

create or replace function public.app_admin_reset_student_password(
  p_token text,
  p_account_id text,
  p_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.app_student_admin(p_token);
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Mật khẩu tạm phải có ít nhất 8 ký tự.';
  end if;
  update public.app_student_accounts
  set password_hash = crypt(p_password, gen_salt('bf', 12)),
      force_change_password = true,
      active = true,
      updated_at = now()
  where id::text = p_account_id;
  if not found then raise exception 'Không tìm thấy tài khoản học viên.'; end if;
  delete from public.app_student_sessions where account_id::text = p_account_id;
  return true;
end;
$$;

create or replace function public.app_student_login(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account public.app_student_accounts;
  v_token text;
begin
  select * into v_account
  from public.app_student_accounts
  where lower(username) = lower(btrim(coalesce(p_username, '')))
  limit 1;

  if v_account.id is null
     or not v_account.active
     or v_account.password_hash <> crypt(coalesce(p_password, ''), v_account.password_hash) then
    raise exception 'Tên đăng nhập hoặc mật khẩu không đúng.';
  end if;

  delete from public.app_student_sessions
  where expires_at <= now() or account_id = v_account.id;

  v_token := 'hvstu_' || encode(gen_random_bytes(32), 'hex');
  insert into public.app_student_sessions(token_hash, account_id, expires_at)
  values (digest(v_token, 'sha256'), v_account.id, now() + interval '30 days');

  return jsonb_build_object('token', v_token, 'role', 'student');
end;
$$;

create or replace function public.app_student_me(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'id', a.id,
    'username', a.username,
    'role', 'student',
    'student_id', a.student_id,
    'force_change_password', a.force_change_password
  )
  into v_result
  from public.app_student_sessions ss
  join public.app_student_accounts a on a.id = ss.account_id
  where ss.token_hash = digest(coalesce(p_token, ''), 'sha256')
    and ss.expires_at > now()
    and a.active
  limit 1;

  if v_result is null then raise exception 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'; end if;
  return v_result;
end;
$$;

create or replace function public.app_student_portal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me jsonb;
  v_row jsonb;
  v_student jsonb;
  v_schedule_token text;
begin
  v_me := public.app_student_me(p_token);
  select to_jsonb(s)
  into v_row
  from public.students s
  where s.id::text = v_me->>'student_id'
  limit 1;
  if v_row is null then raise exception 'Không tìm thấy hồ sơ học viên được liên kết.'; end if;

  v_schedule_token := substring(
    coalesce(v_row->>'notes', '')
    from '(\[\[HV_SCHEDULE_V1:[A-Za-z0-9+/=]+\]\])\s*$'
  );
  v_student := jsonb_build_object(
    'id', v_row->'id',
    'student_code', v_row->'student_code',
    'name', v_row->'name',
    'date_of_birth', v_row->'date_of_birth',
    'cccd', v_row->'cccd',
    'phone', v_row->'phone',
    'address', v_row->'address',
    'license_class', v_row->'license_class',
    'course', v_row->'course',
    'profile_status', v_row->'profile_status',
    'online_status', v_row->'online_status',
    'cabin_status', v_row->'cabin_status',
    'dat_status', v_row->'dat_status',
    'graduation_status', v_row->'graduation_status',
    'exam_status', v_row->'exam_status',
    'tuition_total', v_row->'tuition_total',
    'paid', v_row->'paid',
    'photo_data', v_row->'photo_data',
    'notes', coalesce(v_schedule_token, '')
  );
  return v_student;
end;
$$;

create or replace function public.app_student_change_password(
  p_token text,
  p_old_password text,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me jsonb;
  v_account public.app_student_accounts;
begin
  v_me := public.app_student_me(p_token);
  select * into v_account from public.app_student_accounts where id::text = v_me->>'id';
  if v_account.password_hash <> crypt(coalesce(p_old_password, ''), v_account.password_hash) then
    raise exception 'Mật khẩu hiện tại không đúng.';
  end if;
  if length(coalesce(p_new_password, '')) < 8 then
    raise exception 'Mật khẩu mới phải có ít nhất 8 ký tự.';
  end if;
  update public.app_student_accounts
  set password_hash = crypt(p_new_password, gen_salt('bf', 12)),
      force_change_password = false,
      updated_at = now()
  where id = v_account.id;
  return true;
end;
$$;

create or replace function public.app_student_logout(p_token text)
returns boolean
language sql
security definer
set search_path = public, pg_temp
as $$
  delete from public.app_student_sessions
  where token_hash = digest(coalesce(p_token, ''), 'sha256');
  select true;
$$;

revoke all on function public.app_student_admin(text) from public;
grant execute on function public.app_create_student_account(text,text,text,text) to anon, authenticated;
grant execute on function public.app_list_student_accounts(text) to anon, authenticated;
grant execute on function public.app_set_student_account_active(text,text,boolean) to anon, authenticated;
grant execute on function public.app_admin_reset_student_password(text,text,text) to anon, authenticated;
grant execute on function public.app_student_login(text,text) to anon, authenticated;
grant execute on function public.app_student_me(text) to anon, authenticated;
grant execute on function public.app_student_portal(text) to anon, authenticated;
grant execute on function public.app_student_change_password(text,text,text) to anon, authenticated;
grant execute on function public.app_student_logout(text) to anon, authenticated;

notify pgrst, 'reload schema';
