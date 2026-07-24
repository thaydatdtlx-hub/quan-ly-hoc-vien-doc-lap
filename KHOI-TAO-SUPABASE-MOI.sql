-- HỆ THỐNG QUẢN LÝ HỌC VIÊN THẦY ĐẠT
-- Khởi tạo đầy đủ database cho Supabase project mới.
-- Project đích: pkzxkvcncipfszeukpwu
--
-- CÁCH CHẠY:
-- 1. Dán toàn bộ file này vào Supabase SQL Editor và bấm Run đúng 1 lần.
-- 2. Sau khi thấy "Success", chạy riêng câu lệnh sau với mật khẩu do anh tự chọn:
--    select public.app_bootstrap_admin('trangquocdat', 'MAT_KHAU_IT_NHAT_8_KY_TU');
-- 3. Không gửi mật khẩu admin cho bất kỳ ai.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create sequence if not exists public.student_code_seq start 1;

create table if not exists public.app_users (
  id uuid primary key default extensions.gen_random_uuid(),
  username text not null,
  password_hash text not null,
  role text not null default 'user' check (role in ('admin', 'user')),
  active boolean not null default true,
  force_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists app_users_username_lower_key
  on public.app_users (lower(username));

create table if not exists public.app_sessions (
  token_hash bytea primary key,
  user_id uuid not null references public.app_users(id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists app_sessions_user_id_idx
  on public.app_sessions(user_id);

create table if not exists public.students (
  id uuid primary key default extensions.gen_random_uuid(),
  student_code text not null unique,
  owner_id uuid not null references public.app_users(id),
  name text not null,
  date_of_birth date,
  cccd text not null default '',
  phone text not null default '',
  address text not null default '',
  license_class text not null default 'B số tự động',
  course text not null default '',
  profile_status text not null default 'Đã ghi nhận',
  online_status text not null default 'Chưa hoàn thành',
  cabin_status text not null default 'Chưa hoàn thành',
  dat_status text not null default 'Chưa thực hiện',
  graduation_status text not null default 'Chưa hoàn thành',
  exam_status text not null default 'Chưa thi sát hạch',
  tuition_total numeric(14,0) not null default 0 check (tuition_total >= 0),
  paid numeric(14,0) not null default 0 check (paid >= 0 and paid <= tuition_total),
  notes text not null default '',
  photo_data text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists students_owner_id_idx on public.students(owner_id);
create index if not exists students_name_idx on public.students(lower(name));
create index if not exists students_cccd_idx on public.students(cccd);
create index if not exists students_phone_idx on public.students(phone);

create table if not exists public.app_student_accounts (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id text not null unique,
  username text not null,
  password_hash text not null,
  active boolean not null default true,
  force_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_student_accounts
  alter column id set default extensions.gen_random_uuid();

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

alter table public.app_users enable row level security;
alter table public.app_sessions enable row level security;
alter table public.students enable row level security;
alter table public.app_student_accounts enable row level security;
alter table public.app_student_sessions enable row level security;

revoke all on public.app_users from anon, authenticated;
revoke all on public.app_sessions from anon, authenticated;
revoke all on public.students from anon, authenticated;
revoke all on public.app_student_accounts from anon, authenticated;
revoke all on public.app_student_sessions from anon, authenticated;

-- Chỉ role postgres trong SQL Editor được phép tạo admin đầu tiên.
create or replace function public.app_bootstrap_admin(
  p_username text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
begin
  p_username := lower(btrim(coalesce(p_username, '')));

  if exists (select 1 from public.app_users) then
    raise exception 'Hệ thống đã có tài khoản. Không thể khởi tạo admin lần nữa.';
  end if;
  if p_username !~ '^[a-z0-9._-]{4,40}$' then
    raise exception 'Tên đăng nhập gồm 4–40 ký tự: chữ thường không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.';
  end if;
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Mật khẩu admin phải có ít nhất 8 ký tự.';
  end if;

  insert into public.app_users(
    username, password_hash, role, active, force_change_password
  )
  values (
    p_username,
    extensions.crypt(p_password, extensions.gen_salt('bf', 12)),
    'admin',
    true,
    false
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'username', p_username,
    'role', 'admin'
  );
end;
$$;

create or replace function public.app_login(
  p_username text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_user public.app_users;
  v_token text;
begin
  select *
  into v_user
  from public.app_users
  where lower(username) = lower(btrim(coalesce(p_username, '')))
  limit 1;

  if v_user.id is null
     or not v_user.active
     or v_user.password_hash <> extensions.crypt(coalesce(p_password, ''), v_user.password_hash) then
    raise exception 'Tên đăng nhập hoặc mật khẩu không đúng.';
  end if;

  delete from public.app_sessions
  where expires_at <= now() or user_id = v_user.id;

  v_token := 'hvmgr_' || encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.app_sessions(token_hash, user_id, expires_at)
  values (
    extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'),
    v_user.id,
    now() + interval '30 days'
  );

  return jsonb_build_object(
    'token', v_token,
    'role', v_user.role
  );
end;
$$;

create or replace function public.app_me(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_result jsonb;
begin
  select jsonb_build_object(
    'id', u.id,
    'username', u.username,
    'role', u.role,
    'active', u.active,
    'force_change_password', u.force_change_password
  )
  into v_result
  from public.app_sessions s
  join public.app_users u on u.id = s.user_id
  where s.token_hash = extensions.digest(
      convert_to(coalesce(p_token, ''), 'UTF8'),
      'sha256'
    )
    and s.expires_at > now()
    and u.active
  limit 1;

  if v_result is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.';
  end if;

  return v_result;
end;
$$;

create or replace function public.app_logout(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  delete from public.app_sessions
  where token_hash = extensions.digest(
    convert_to(coalesce(p_token, ''), 'UTF8'),
    'sha256'
  );
  return true;
end;
$$;

create or replace function public.app_require_admin(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
begin
  v_me := public.app_me(p_token);
  if coalesce(v_me->>'role', '') <> 'admin' then
    raise exception 'Chỉ tài khoản admin được thực hiện thao tác này.';
  end if;
  return v_me;
end;
$$;

create or replace function public.app_list_users(p_token text)
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
        'id', u.id,
        'username', u.username,
        'role', u.role,
        'active', u.active,
        'force_change_password', u.force_change_password,
        'created_at', u.created_at
      )
      order by case when u.role = 'admin' then 0 else 1 end, lower(u.username)
    )
    from public.app_users u
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_create_user(
  p_token text,
  p_username text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid;
begin
  perform public.app_require_admin(p_token);
  p_username := lower(btrim(coalesce(p_username, '')));

  if p_username !~ '^[a-z0-9._-]{4,40}$' then
    raise exception 'Tên đăng nhập gồm 4–40 ký tự: chữ thường không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.';
  end if;
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Mật khẩu tạm phải có ít nhất 8 ký tự.';
  end if;

  insert into public.app_users(
    username, password_hash, role, active, force_change_password
  )
  values (
    p_username,
    extensions.crypt(p_password, extensions.gen_salt('bf', 12)),
    'user',
    true,
    true
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'username', p_username,
    'role', 'user'
  );
exception
  when unique_violation then
    raise exception 'Tên đăng nhập này đã được sử dụng.';
end;
$$;

create or replace function public.app_set_user_active(
  p_token text,
  p_user_id text,
  p_active boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_role text;
begin
  perform public.app_require_admin(p_token);

  select role into v_role
  from public.app_users
  where id::text = btrim(coalesce(p_user_id, ''));

  if v_role is null then
    raise exception 'Không tìm thấy tài khoản quản lý.';
  end if;
  if v_role = 'admin' then
    raise exception 'Không thể khóa tài khoản admin.';
  end if;

  update public.app_users
  set active = coalesce(p_active, false), updated_at = now()
  where id::text = btrim(coalesce(p_user_id, ''));

  if not coalesce(p_active, false) then
    delete from public.app_sessions
    where user_id::text = btrim(coalesce(p_user_id, ''));
  end if;

  return true;
end;
$$;

create or replace function public.app_admin_reset_password(
  p_token text,
  p_user_id text,
  p_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  perform public.app_require_admin(p_token);

  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Mật khẩu tạm phải có ít nhất 8 ký tự.';
  end if;

  update public.app_users
  set password_hash = extensions.crypt(
        p_password,
        extensions.gen_salt('bf', 12)
      ),
      force_change_password = true,
      active = true,
      updated_at = now()
  where id::text = btrim(coalesce(p_user_id, ''));

  if not found then
    raise exception 'Không tìm thấy tài khoản quản lý.';
  end if;

  delete from public.app_sessions
  where user_id::text = btrim(coalesce(p_user_id, ''));

  return true;
end;
$$;

create or replace function public.app_change_password(
  p_token text,
  p_old_password text,
  p_new_password text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_user public.app_users;
begin
  v_me := public.app_me(p_token);

  select *
  into v_user
  from public.app_users
  where id::text = v_me->>'id';

  if v_user.password_hash <> extensions.crypt(
    coalesce(p_old_password, ''),
    v_user.password_hash
  ) then
    raise exception 'Mật khẩu hiện tại không đúng.';
  end if;
  if length(coalesce(p_new_password, '')) < 8 then
    raise exception 'Mật khẩu mới phải có ít nhất 8 ký tự.';
  end if;

  update public.app_users
  set password_hash = extensions.crypt(
        p_new_password,
        extensions.gen_salt('bf', 12)
      ),
      force_change_password = false,
      updated_at = now()
  where id = v_user.id;

  return true;
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
      to_jsonb(s) ||
      jsonb_build_object('owner_username', u.username)
      order by s.created_at desc, s.student_code desc
    )
    from public.students s
    join public.app_users u on u.id = s.owner_id
    where (
      coalesce(v_me->>'role', '') = 'admin'
      and (
        nullif(btrim(coalesce(p_owner_id, '')), '') is null
        or s.owner_id::text = btrim(p_owner_id)
      )
    ) or (
      coalesce(v_me->>'role', '') <> 'admin'
      and s.owner_id::text = v_me->>'id'
    )
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_save_student(
  p_token text,
  p_student_id text,
  p_data jsonb,
  p_owner_id text
)
returns text
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_id uuid;
  v_owner_id uuid;
  v_total numeric(14,0);
  v_paid numeric(14,0);
  v_date_of_birth date;
  v_code text;
begin
  v_me := public.app_me(p_token);
  p_data := coalesce(p_data, '{}'::jsonb);

  if btrim(coalesce(p_data->>'name', '')) = '' then
    raise exception 'Vui lòng nhập họ và tên.';
  end if;

  begin
    v_total := coalesce(nullif(p_data->>'tuition_total', '')::numeric, 0);
    v_paid := coalesce(nullif(p_data->>'paid', '')::numeric, 0);
  exception
    when invalid_text_representation then
      raise exception 'Học phí phải là số hợp lệ.';
  end;

  if v_total < 0 or v_paid < 0 then
    raise exception 'Học phí không được là số âm.';
  end if;
  if v_paid > v_total then
    raise exception 'Số tiền đã thu không được lớn hơn tổng học phí.';
  end if;

  begin
    v_date_of_birth := nullif(btrim(coalesce(p_data->>'date_of_birth', '')), '')::date;
  exception
    when invalid_datetime_format or datetime_field_overflow then
      raise exception 'Ngày sinh không hợp lệ.';
  end;

  if coalesce(v_me->>'role', '') = 'admin' then
    select id into v_owner_id
    from public.app_users
    where id::text = coalesce(
      nullif(btrim(coalesce(p_owner_id, '')), ''),
      v_me->>'id'
    )
    limit 1;
  else
    v_owner_id := (v_me->>'id')::uuid;
  end if;

  if v_owner_id is null then
    raise exception 'Không tìm thấy tài khoản quản lý được giao.';
  end if;

  if nullif(btrim(coalesce(p_student_id, '')), '') is null then
    v_id := extensions.gen_random_uuid();
    v_code := 'HV-' || lpad(nextval('public.student_code_seq')::text, 4, '0');

    insert into public.students(
      id,
      student_code,
      owner_id,
      name,
      date_of_birth,
      cccd,
      phone,
      address,
      license_class,
      course,
      profile_status,
      online_status,
      cabin_status,
      dat_status,
      graduation_status,
      exam_status,
      tuition_total,
      paid,
      notes,
      photo_data
    )
    values (
      v_id,
      v_code,
      v_owner_id,
      btrim(p_data->>'name'),
      v_date_of_birth,
      btrim(coalesce(p_data->>'cccd', '')),
      btrim(coalesce(p_data->>'phone', '')),
      btrim(coalesce(p_data->>'address', '')),
      coalesce(nullif(btrim(p_data->>'license_class'), ''), 'B số tự động'),
      btrim(coalesce(p_data->>'course', '')),
      coalesce(nullif(btrim(p_data->>'profile_status'), ''), 'Đã ghi nhận'),
      coalesce(nullif(btrim(p_data->>'online_status'), ''), 'Chưa hoàn thành'),
      coalesce(nullif(btrim(p_data->>'cabin_status'), ''), 'Chưa hoàn thành'),
      coalesce(nullif(btrim(p_data->>'dat_status'), ''), 'Chưa thực hiện'),
      coalesce(nullif(btrim(p_data->>'graduation_status'), ''), 'Chưa hoàn thành'),
      coalesce(nullif(btrim(p_data->>'exam_status'), ''), 'Chưa thi sát hạch'),
      v_total,
      v_paid,
      coalesce(p_data->>'notes', ''),
      coalesce(p_data->>'photo_data', '')
    );
  else
    update public.students
    set name = btrim(p_data->>'name'),
        date_of_birth = v_date_of_birth,
        cccd = btrim(coalesce(p_data->>'cccd', '')),
        phone = btrim(coalesce(p_data->>'phone', '')),
        address = btrim(coalesce(p_data->>'address', '')),
        license_class = coalesce(
          nullif(btrim(p_data->>'license_class'), ''),
          'B số tự động'
        ),
        course = btrim(coalesce(p_data->>'course', '')),
        profile_status = coalesce(
          nullif(btrim(p_data->>'profile_status'), ''),
          'Đã ghi nhận'
        ),
        online_status = coalesce(
          nullif(btrim(p_data->>'online_status'), ''),
          'Chưa hoàn thành'
        ),
        cabin_status = coalesce(
          nullif(btrim(p_data->>'cabin_status'), ''),
          'Chưa hoàn thành'
        ),
        dat_status = coalesce(
          nullif(btrim(p_data->>'dat_status'), ''),
          'Chưa thực hiện'
        ),
        graduation_status = coalesce(
          nullif(btrim(p_data->>'graduation_status'), ''),
          'Chưa hoàn thành'
        ),
        exam_status = coalesce(
          nullif(btrim(p_data->>'exam_status'), ''),
          'Chưa thi sát hạch'
        ),
        tuition_total = v_total,
        paid = v_paid,
        notes = coalesce(p_data->>'notes', ''),
        photo_data = coalesce(p_data->>'photo_data', ''),
        updated_at = now()
    where id::text = btrim(p_student_id)
      and (
        coalesce(v_me->>'role', '') = 'admin'
        or owner_id::text = v_me->>'id'
      )
    returning id into v_id;

    if v_id is null then
      raise exception 'Không tìm thấy học viên hoặc tài khoản không có quyền sửa.';
    end if;
  end if;

  return v_id::text;
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
  v_owner_id uuid;
begin
  v_me := public.app_me(p_token);

  select owner_id into v_owner_id
  from public.students
  where id::text = btrim(coalesce(p_student_id, ''));

  if v_owner_id is null then
    raise exception 'Không tìm thấy hồ sơ học viên.';
  end if;
  if coalesce(v_me->>'role', '') <> 'admin'
     and v_owner_id::text <> v_me->>'id' then
    raise exception 'Tài khoản không có quyền xóa học viên này.';
  end if;

  delete from public.app_student_accounts
  where student_id = btrim(p_student_id);

  delete from public.students
  where id::text = btrim(p_student_id);

  return true;
end;
$$;

create or replace function public.app_admin_save_student_schedule(
  p_token text,
  p_student_id text,
  p_notes text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  perform public.app_require_admin(p_token);

  update public.students
  set notes = coalesce(p_notes, ''), updated_at = now()
  where id::text = btrim(coalesce(p_student_id, ''));

  if not found then
    raise exception 'Không tìm thấy hồ sơ học viên.';
  end if;

  return true;
end;
$$;

create or replace function public.app_student_admin(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  return public.app_require_admin(p_token);
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
set search_path = public, extensions, pg_temp
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

  -- Tự xóa tài khoản mồ côi của học viên đã bị xóa trước đó.
  delete from public.app_student_accounts a
  where (
      a.student_id = p_student_id
      or lower(a.username) = p_username
    )
    and not exists (
      select 1
      from public.students s
      where s.id::text = a.student_id
    );

  insert into public.app_student_accounts(
    student_id,
    username,
    password_hash
  )
  values (
    p_student_id,
    p_username,
    extensions.crypt(p_password, extensions.gen_salt('bf', 12))
  )
  returning id into v_id;

  return jsonb_build_object(
    'id', v_id,
    'username', p_username,
    'student_id', p_student_id
  );
exception
  when unique_violation then
    if exists (
      select 1
      from public.app_student_accounts
      where student_id = p_student_id
    ) then
      raise exception 'Học viên này đã có tài khoản đăng nhập.';
    end if;
    raise exception 'Tên đăng nhập này đã được sử dụng.';
end;
$$;

create or replace function public.app_list_student_accounts(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
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
set search_path = public, extensions, pg_temp
as $$
begin
  perform public.app_student_admin(p_token);

  update public.app_student_accounts
  set active = coalesce(p_active, false), updated_at = now()
  where id::text = btrim(coalesce(p_account_id, ''));

  if not found then
    raise exception 'Không tìm thấy tài khoản học viên.';
  end if;

  if not coalesce(p_active, false) then
    delete from public.app_student_sessions
    where account_id::text = btrim(coalesce(p_account_id, ''));
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
set search_path = public, extensions, pg_temp
as $$
begin
  perform public.app_student_admin(p_token);

  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Mật khẩu tạm phải có ít nhất 8 ký tự.';
  end if;

  update public.app_student_accounts
  set password_hash = extensions.crypt(
        p_password,
        extensions.gen_salt('bf', 12)
      ),
      force_change_password = true,
      active = true,
      updated_at = now()
  where id::text = btrim(coalesce(p_account_id, ''));

  if not found then
    raise exception 'Không tìm thấy tài khoản học viên.';
  end if;

  delete from public.app_student_sessions
  where account_id::text = btrim(coalesce(p_account_id, ''));

  return true;
end;
$$;

create or replace function public.app_student_login(
  p_username text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_account public.app_student_accounts;
  v_token text;
begin
  select *
  into v_account
  from public.app_student_accounts
  where lower(username) = lower(btrim(coalesce(p_username, '')))
  limit 1;

  if v_account.id is null
     or not v_account.active
     or v_account.password_hash <> extensions.crypt(
       coalesce(p_password, ''),
       v_account.password_hash
     ) then
    raise exception 'Tên đăng nhập hoặc mật khẩu không đúng.';
  end if;

  delete from public.app_student_sessions
  where expires_at <= now() or account_id = v_account.id;

  v_token := 'hvstu_' || encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.app_student_sessions(
    token_hash,
    account_id,
    expires_at
  )
  values (
    extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'),
    v_account.id,
    now() + interval '30 days'
  );

  return jsonb_build_object('token', v_token, 'role', 'student');
end;
$$;

create or replace function public.app_student_me(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
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
  where ss.token_hash = extensions.digest(
      convert_to(coalesce(p_token, ''), 'UTF8'),
      'sha256'
    )
    and ss.expires_at > now()
    and a.active
  limit 1;

  if v_result is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.';
  end if;

  return v_result;
end;
$$;

create or replace function public.app_student_portal(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_row jsonb;
  v_schedule_token text;
begin
  v_me := public.app_student_me(p_token);

  select to_jsonb(s)
  into v_row
  from public.students s
  where s.id::text = v_me->>'student_id'
  limit 1;

  if v_row is null then
    raise exception 'Không tìm thấy hồ sơ học viên được liên kết.';
  end if;

  v_schedule_token := substring(
    coalesce(v_row->>'notes', '')
    from '(\[\[HV_SCHEDULE_V1:[A-Za-z0-9+/=]+\]\])\s*$'
  );

  return jsonb_build_object(
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
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_account public.app_student_accounts;
begin
  v_me := public.app_student_me(p_token);

  select *
  into v_account
  from public.app_student_accounts
  where id::text = v_me->>'id';

  if v_account.password_hash <> extensions.crypt(
    coalesce(p_old_password, ''),
    v_account.password_hash
  ) then
    raise exception 'Mật khẩu hiện tại không đúng.';
  end if;
  if length(coalesce(p_new_password, '')) < 8 then
    raise exception 'Mật khẩu mới phải có ít nhất 8 ký tự.';
  end if;

  update public.app_student_accounts
  set password_hash = extensions.crypt(
        p_new_password,
        extensions.gen_salt('bf', 12)
      ),
      force_change_password = false,
      updated_at = now()
  where id = v_account.id;

  return true;
end;
$$;

create or replace function public.app_student_logout(p_token text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  delete from public.app_student_sessions
  where token_hash = extensions.digest(
    convert_to(coalesce(p_token, ''), 'UTF8'),
    'sha256'
  );
  return true;
end;
$$;

-- Khóa quyền truy cập trực tiếp vào các hàm nội bộ.
revoke all on function public.app_bootstrap_admin(text,text) from public;
revoke all on function public.app_require_admin(text) from public;
revoke all on function public.app_student_admin(text) from public;

-- Gỡ quyền mặc định rồi chỉ cấp quyền gọi các RPC mà website cần.
revoke all on function public.app_login(text,text) from public;
revoke all on function public.app_me(text) from public;
revoke all on function public.app_logout(text) from public;
revoke all on function public.app_list_users(text) from public;
revoke all on function public.app_create_user(text,text,text) from public;
revoke all on function public.app_set_user_active(text,text,boolean) from public;
revoke all on function public.app_admin_reset_password(text,text,text) from public;
revoke all on function public.app_change_password(text,text,text) from public;
revoke all on function public.app_list_students(text,text) from public;
revoke all on function public.app_save_student(text,text,jsonb,text) from public;
revoke all on function public.app_delete_student(text,text) from public;
revoke all on function public.app_admin_save_student_schedule(text,text,text) from public;
revoke all on function public.app_create_student_account(text,text,text,text) from public;
revoke all on function public.app_list_student_accounts(text) from public;
revoke all on function public.app_set_student_account_active(text,text,boolean) from public;
revoke all on function public.app_admin_reset_student_password(text,text,text) from public;
revoke all on function public.app_student_login(text,text) from public;
revoke all on function public.app_student_me(text) from public;
revoke all on function public.app_student_portal(text) from public;
revoke all on function public.app_student_change_password(text,text,text) from public;
revoke all on function public.app_student_logout(text) from public;

grant usage on schema public to anon, authenticated;

grant execute on function public.app_login(text,text) to anon, authenticated;
grant execute on function public.app_me(text) to anon, authenticated;
grant execute on function public.app_logout(text) to anon, authenticated;
grant execute on function public.app_list_users(text) to anon, authenticated;
grant execute on function public.app_create_user(text,text,text) to anon, authenticated;
grant execute on function public.app_set_user_active(text,text,boolean) to anon, authenticated;
grant execute on function public.app_admin_reset_password(text,text,text) to anon, authenticated;
grant execute on function public.app_change_password(text,text,text) to anon, authenticated;
grant execute on function public.app_list_students(text,text) to anon, authenticated;
grant execute on function public.app_save_student(text,text,jsonb,text) to anon, authenticated;
grant execute on function public.app_delete_student(text,text) to anon, authenticated;
grant execute on function public.app_admin_save_student_schedule(text,text,text) to anon, authenticated;

grant execute on function public.app_create_student_account(text,text,text,text) to anon, authenticated;
grant execute on function public.app_list_student_accounts(text) to anon, authenticated;
grant execute on function public.app_set_student_account_active(text,text,boolean) to anon, authenticated;
grant execute on function public.app_admin_reset_student_password(text,text,text) to anon, authenticated;
grant execute on function public.app_student_login(text,text) to anon, authenticated;
grant execute on function public.app_student_me(text) to anon, authenticated;
grant execute on function public.app_student_portal(text) to anon, authenticated;
grant execute on function public.app_student_change_password(text,text,text) to anon, authenticated;
grant execute on function public.app_student_logout(text) to anon, authenticated;

select pg_notify('pgrst', 'reload schema');

commit;

-- KIỂM TRA SAU KHI CHẠY:
select
  to_regclass('public.app_users') as app_users,
  to_regclass('public.students') as students,
  to_regclass('public.app_student_accounts') as student_accounts,
  to_regprocedure('public.app_login(text,text)') as app_login,
  to_regprocedure('public.app_save_student(text,text,jsonb,text)') as app_save_student,
  to_regprocedure('public.app_student_login(text,text)') as app_student_login;
