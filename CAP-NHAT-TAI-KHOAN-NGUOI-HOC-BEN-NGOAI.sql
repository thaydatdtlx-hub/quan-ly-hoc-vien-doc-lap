-- TÀI KHOẢN TỰ ĐĂNG KÝ CHO NGƯỜI HỌC 600 CÂU
-- Chạy toàn bộ file này một lần trong Supabase SQL Editor.
-- Người học bên ngoài chỉ dùng được khu 600 câu, không đọc được hồ sơ học viên.

begin;

alter table public.app_student_accounts
  alter column student_id drop not null;

alter table public.app_student_accounts
  add column if not exists account_type text not null default 'student',
  add column if not exists full_name text,
  add column if not exists phone text,
  add column if not exists last_login_at timestamptz;

update public.app_student_accounts
set account_type = 'student'
where account_type is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'app_student_accounts_account_type_check'
      and conrelid = 'public.app_student_accounts'::regclass
  ) then
    alter table public.app_student_accounts
      add constraint app_student_accounts_account_type_check
      check (account_type in ('student', 'public_theory'));
  end if;
end;
$$;

create unique index if not exists app_public_theory_phone_key
  on public.app_student_accounts(phone)
  where account_type = 'public_theory' and phone is not null;

create index if not exists app_student_accounts_type_created_idx
  on public.app_student_accounts(account_type, created_at desc);

create table if not exists public.app_public_theory_progress (
  account_id uuid primary key references public.app_student_accounts(id) on delete cascade,
  progress_data jsonb not null default '{"answers":{},"bookmarks":[],"lastId":1}'::jsonb,
  answered_count integer not null default 0 check (answered_count between 0 and 600),
  correct_count integer not null default 0 check (correct_count between 0 and 600),
  wrong_count integer not null default 0 check (wrong_count between 0 and 600),
  bookmarks_count integer not null default 0 check (bookmarks_count between 0 and 600),
  last_question_id integer not null default 1 check (last_question_id between 1 and 600),
  last_activity timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_public_theory_exam_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  account_id uuid not null references public.app_student_accounts(id) on delete cascade,
  license_class text not null check (license_class in ('A1', 'A', 'B', 'C1')),
  score integer not null check (score >= 0),
  total integer not null check (total in (25, 30, 35)),
  passed boolean not null,
  critical_correct boolean not null,
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
  submitted_at timestamptz not null default now()
);

create index if not exists app_public_theory_exam_account_date_idx
  on public.app_public_theory_exam_attempts(account_id, submitted_at desc);

alter table public.app_public_theory_progress enable row level security;
alter table public.app_public_theory_exam_attempts enable row level security;
revoke all on public.app_public_theory_progress from anon, authenticated;
revoke all on public.app_public_theory_exam_attempts from anon, authenticated;

create or replace function public.app_student_login(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_account public.app_student_accounts;
  v_token text;
  v_role text;
begin
  select * into v_account
  from public.app_student_accounts
  where lower(username) = lower(btrim(coalesce(p_username, '')))
  limit 1;

  if v_account.id is null
     or not v_account.active
     or v_account.password_hash <> extensions.crypt(coalesce(p_password, ''), v_account.password_hash) then
    raise exception 'Tên đăng nhập hoặc mật khẩu không đúng.';
  end if;

  delete from public.app_student_sessions
  where expires_at <= now() or account_id = v_account.id;

  v_token := 'hvstu_' || encode(extensions.gen_random_bytes(32), 'hex');
  insert into public.app_student_sessions(token_hash, account_id, expires_at)
  values (extensions.digest(convert_to(v_token, 'UTF8'), 'sha256'), v_account.id, now() + interval '30 days');

  update public.app_student_accounts
  set last_login_at = now(), updated_at = now()
  where id = v_account.id;

  v_role := case when v_account.account_type = 'public_theory' then 'public_theory' else 'student' end;
  return jsonb_build_object('token', v_token, 'role', v_role);
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
    'role', case when a.account_type = 'public_theory' then 'public_theory' else 'student' end,
    'account_type', a.account_type,
    'student_id', a.student_id,
    'full_name', a.full_name,
    'phone', a.phone,
    'force_change_password', a.force_change_password
  )
  into v_result
  from public.app_student_sessions ss
  join public.app_student_accounts a on a.id = ss.account_id
  where ss.token_hash = extensions.digest(convert_to(coalesce(p_token, ''), 'UTF8'), 'sha256')
    and ss.expires_at > now()
    and a.active
  limit 1;

  if v_result is null then
    raise exception 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.';
  end if;
  return v_result;
end;
$$;

create or replace function public.app_public_theory_register(
  p_full_name text,
  p_phone text,
  p_username text,
  p_password text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_name text;
  v_phone text;
  v_username text;
  v_id uuid;
begin
  v_name := regexp_replace(btrim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
  v_phone := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_username := lower(btrim(coalesce(p_username, '')));

  if length(v_name) < 2 or length(v_name) > 80 then
    raise exception 'Họ và tên phải có từ 2 đến 80 ký tự.';
  end if;
  if v_phone !~ '^[0-9]{9,11}$' then
    raise exception 'Số điện thoại phải có từ 9 đến 11 chữ số.';
  end if;
  if v_username !~ '^[a-z0-9._-]{4,40}$' then
    raise exception 'Tên đăng nhập gồm 4–40 ký tự: chữ thường không dấu, số, dấu chấm, gạch dưới hoặc gạch ngang.';
  end if;
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Mật khẩu phải có ít nhất 8 ký tự.';
  end if;

  insert into public.app_student_accounts(
    student_id, username, password_hash, active, force_change_password,
    account_type, full_name, phone
  )
  values (
    null, v_username, extensions.crypt(p_password, extensions.gen_salt('bf', 12)),
    true, false, 'public_theory', v_name, v_phone
  )
  returning id into v_id;

  return public.app_student_login(v_username, p_password);
exception
  when unique_violation then
    if exists (
      select 1 from public.app_student_accounts
      where account_type = 'public_theory' and phone = v_phone
    ) then
      raise exception 'Số điện thoại này đã được dùng để tạo tài khoản.';
    end if;
    raise exception 'Tên đăng nhập này đã được sử dụng.';
end;
$$;

create or replace function public.app_public_theory_get_progress(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me jsonb;
  v_account_id uuid;
  v_result jsonb;
begin
  v_me := public.app_student_me(p_token);
  if coalesce(v_me->>'role', '') <> 'public_theory' then
    raise exception 'Tài khoản không có quyền sử dụng chức năng này.';
  end if;
  v_account_id := (v_me->>'id')::uuid;

  select jsonb_build_object(
    'account_id', a.id,
    'account_name', a.full_name,
    'username', a.username,
    'progress_data', coalesce(p.progress_data, '{"answers":{},"bookmarks":[],"lastId":1}'::jsonb),
    'answered_count', coalesce(p.answered_count, 0),
    'correct_count', coalesce(p.correct_count, 0),
    'wrong_count', coalesce(p.wrong_count, 0),
    'bookmarks_count', coalesce(p.bookmarks_count, 0),
    'last_question_id', coalesce(p.last_question_id, 1),
    'last_activity', p.last_activity,
    'exam_count', (select count(*) from public.app_public_theory_exam_attempts e where e.account_id = a.id),
    'passed_exam_count', (select count(*) from public.app_public_theory_exam_attempts e where e.account_id = a.id and e.passed)
  )
  into v_result
  from public.app_student_accounts a
  left join public.app_public_theory_progress p on p.account_id = a.id
  where a.id = v_account_id and a.account_type = 'public_theory';

  if v_result is null then raise exception 'Không tìm thấy tài khoản người học.'; end if;
  return v_result;
end;
$$;

create or replace function public.app_public_theory_save_progress(
  p_token text,
  p_progress jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me jsonb;
  v_account_id uuid;
  v_answers jsonb;
  v_bookmarks jsonb;
  v_answered integer;
  v_correct integer;
  v_wrong integer;
  v_bookmarks_count integer;
  v_last integer;
begin
  v_me := public.app_student_me(p_token);
  if coalesce(v_me->>'role', '') <> 'public_theory' then
    raise exception 'Tài khoản không có quyền sử dụng chức năng này.';
  end if;
  v_account_id := (v_me->>'id')::uuid;
  p_progress := coalesce(p_progress, '{}'::jsonb);
  v_answers := coalesce(p_progress->'answers', '{}'::jsonb);
  v_bookmarks := coalesce(p_progress->'bookmarks', '[]'::jsonb);

  if jsonb_typeof(v_answers) <> 'object' then
    raise exception 'Dữ liệu câu đã học không hợp lệ.';
  end if;
  if jsonb_typeof(v_bookmarks) <> 'array' then
    raise exception 'Dữ liệu câu đánh dấu không hợp lệ.';
  end if;

  v_answered := (select count(*) from jsonb_object_keys(v_answers));
  v_bookmarks_count := jsonb_array_length(v_bookmarks);
  if v_answered > 600 or exists (
    select 1 from jsonb_each_text(v_answers) item
    where item.key !~ '^[1-9][0-9]{0,2}$'
      or item.key::integer not between 1 and 600
      or item.value !~ '^[1-4]$'
  ) then
    raise exception 'Danh sách câu đã học vượt phạm vi bộ 600 câu.';
  end if;
  if v_bookmarks_count > 600 or exists (
    select 1 from jsonb_array_elements_text(v_bookmarks) item(value)
    where item.value !~ '^[1-9][0-9]{0,2}$'
      or item.value::integer not between 1 and 600
  ) then
    raise exception 'Danh sách câu đánh dấu vượt phạm vi bộ 600 câu.';
  end if;

  v_correct := greatest(0, least(v_answered, coalesce(nullif(p_progress->>'correct_count', '')::integer, 0)));
  v_wrong := v_answered - v_correct;
  v_last := greatest(1, least(600, coalesce(nullif(p_progress->>'lastId', '')::integer, 1)));

  insert into public.app_public_theory_progress(
    account_id, progress_data, answered_count, correct_count, wrong_count,
    bookmarks_count, last_question_id, last_activity, updated_at
  )
  values (
    v_account_id,
    jsonb_build_object('answers', v_answers, 'bookmarks', v_bookmarks, 'lastId', v_last),
    v_answered, v_correct, v_wrong, v_bookmarks_count, v_last, now(), now()
  )
  on conflict (account_id) do update
  set progress_data = excluded.progress_data,
      answered_count = excluded.answered_count,
      correct_count = excluded.correct_count,
      wrong_count = excluded.wrong_count,
      bookmarks_count = excluded.bookmarks_count,
      last_question_id = excluded.last_question_id,
      last_activity = excluded.last_activity,
      updated_at = excluded.updated_at;

  return jsonb_build_object(
    'account_id', v_account_id,
    'answered_count', v_answered,
    'correct_count', v_correct,
    'wrong_count', v_wrong,
    'bookmarks_count', v_bookmarks_count,
    'last_question_id', v_last,
    'last_activity', now()
  );
exception
  when invalid_text_representation then
    raise exception 'Dữ liệu tiến độ không hợp lệ.';
end;
$$;

create or replace function public.app_public_theory_save_exam_attempt(
  p_token text,
  p_license_class text,
  p_score integer,
  p_total integer,
  p_critical_correct boolean,
  p_elapsed_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me jsonb;
  v_account_id uuid;
  v_class text;
  v_total integer;
  v_pass_score integer;
  v_max_seconds integer;
  v_score integer;
  v_elapsed integer;
  v_passed boolean;
  v_id uuid;
  v_submitted_at timestamptz;
begin
  v_me := public.app_student_me(p_token);
  if coalesce(v_me->>'role', '') <> 'public_theory' then
    raise exception 'Tài khoản không có quyền sử dụng chức năng này.';
  end if;
  v_account_id := (v_me->>'id')::uuid;
  v_class := upper(btrim(coalesce(p_license_class, '')));

  case v_class
    when 'A1' then v_total := 25; v_pass_score := 21; v_max_seconds := 19 * 60;
    when 'A' then v_total := 25; v_pass_score := 23; v_max_seconds := 19 * 60;
    when 'B' then v_total := 30; v_pass_score := 27; v_max_seconds := 20 * 60;
    when 'C1' then v_total := 35; v_pass_score := 32; v_max_seconds := 22 * 60;
    else raise exception 'Hạng thi không hợp lệ.';
  end case;

  if coalesce(p_total, 0) <> v_total then
    raise exception 'Số câu của bài thi không đúng cấu trúc hạng %.', v_class;
  end if;

  v_score := greatest(0, least(v_total, coalesce(p_score, 0)));
  v_elapsed := greatest(0, least(v_max_seconds, coalesce(p_elapsed_seconds, 0)));
  v_passed := v_score >= v_pass_score and coalesce(p_critical_correct, false);
  v_submitted_at := now();

  insert into public.app_public_theory_exam_attempts(
    account_id, license_class, score, total, passed,
    critical_correct, elapsed_seconds, submitted_at
  )
  values (
    v_account_id, v_class, v_score, v_total, v_passed,
    coalesce(p_critical_correct, false), v_elapsed, v_submitted_at
  )
  returning id into v_id;

  insert into public.app_public_theory_progress(account_id, last_activity, updated_at)
  values (v_account_id, v_submitted_at, v_submitted_at)
  on conflict (account_id) do update
  set last_activity = excluded.last_activity,
      updated_at = excluded.updated_at;

  delete from public.app_public_theory_exam_attempts old_attempt
  where old_attempt.account_id = v_account_id
    and old_attempt.id in (
      select e.id
      from public.app_public_theory_exam_attempts e
      where e.account_id = v_account_id
      order by e.submitted_at desc
      offset 200
    );

  return jsonb_build_object(
    'id', v_id,
    'account_id', v_account_id,
    'license_class', v_class,
    'score', v_score,
    'total', v_total,
    'passed', v_passed,
    'critical_correct', coalesce(p_critical_correct, false),
    'elapsed_seconds', v_elapsed,
    'submitted_at', v_submitted_at
  );
end;
$$;

create or replace function public.app_admin_list_public_theory_accounts(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.app_require_admin(p_token);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', a.id,
      'username', a.username,
      'full_name', a.full_name,
      'phone', a.phone,
      'active', a.active,
      'created_at', a.created_at,
      'last_login_at', a.last_login_at,
      'answered_count', coalesce(p.answered_count, 0),
      'correct_count', coalesce(p.correct_count, 0),
      'last_activity', p.last_activity,
      'exam_count', (select count(*) from public.app_public_theory_exam_attempts e where e.account_id = a.id),
      'passed_exam_count', (select count(*) from public.app_public_theory_exam_attempts e where e.account_id = a.id and e.passed),
      'best_score', (
        select e.score from public.app_public_theory_exam_attempts e
        where e.account_id = a.id
        order by (e.score::numeric / nullif(e.total, 0)) desc, e.submitted_at desc limit 1
      ),
      'best_total', (
        select e.total from public.app_public_theory_exam_attempts e
        where e.account_id = a.id
        order by (e.score::numeric / nullif(e.total, 0)) desc, e.submitted_at desc limit 1
      )
    ) order by a.created_at desc)
    from public.app_student_accounts a
    left join public.app_public_theory_progress p on p.account_id = a.id
    where a.account_type = 'public_theory'
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_admin_set_public_theory_active(
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
  perform public.app_require_admin(p_token);
  update public.app_student_accounts
  set active = coalesce(p_active, false), updated_at = now()
  where id::text = p_account_id and account_type = 'public_theory';
  if not found then raise exception 'Không tìm thấy tài khoản người học bên ngoài.'; end if;
  if not coalesce(p_active, false) then
    delete from public.app_student_sessions where account_id::text = p_account_id;
  end if;
  return true;
end;
$$;

create or replace function public.app_admin_reset_public_theory_password(
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
  perform public.app_require_admin(p_token);
  if length(coalesce(p_password, '')) < 8 then
    raise exception 'Mật khẩu tạm phải có ít nhất 8 ký tự.';
  end if;
  update public.app_student_accounts
  set password_hash = extensions.crypt(p_password, extensions.gen_salt('bf', 12)),
      force_change_password = false,
      active = true,
      updated_at = now()
  where id::text = p_account_id and account_type = 'public_theory';
  if not found then raise exception 'Không tìm thấy tài khoản người học bên ngoài.'; end if;
  delete from public.app_student_sessions where account_id::text = p_account_id;
  return true;
end;
$$;

create or replace function public.app_admin_delete_public_theory_account(
  p_token text,
  p_account_id text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.app_require_admin(p_token);
  delete from public.app_student_accounts
  where id::text = p_account_id and account_type = 'public_theory';
  if not found then raise exception 'Không tìm thấy tài khoản người học bên ngoài.'; end if;
  return true;
end;
$$;

revoke all on function public.app_public_theory_register(text,text,text,text) from public;
revoke all on function public.app_public_theory_get_progress(text) from public;
revoke all on function public.app_public_theory_save_progress(text,jsonb) from public;
revoke all on function public.app_public_theory_save_exam_attempt(text,text,integer,integer,boolean,integer) from public;
revoke all on function public.app_admin_list_public_theory_accounts(text) from public;
revoke all on function public.app_admin_set_public_theory_active(text,text,boolean) from public;
revoke all on function public.app_admin_reset_public_theory_password(text,text,text) from public;
revoke all on function public.app_admin_delete_public_theory_account(text,text) from public;

grant execute on function public.app_public_theory_register(text,text,text,text) to anon, authenticated;
grant execute on function public.app_public_theory_get_progress(text) to anon, authenticated;
grant execute on function public.app_public_theory_save_progress(text,jsonb) to anon, authenticated;
grant execute on function public.app_public_theory_save_exam_attempt(text,text,integer,integer,boolean,integer) to anon, authenticated;
grant execute on function public.app_admin_list_public_theory_accounts(text) to anon, authenticated;
grant execute on function public.app_admin_set_public_theory_active(text,text,boolean) to anon, authenticated;
grant execute on function public.app_admin_reset_public_theory_password(text,text,text) to anon, authenticated;
grant execute on function public.app_admin_delete_public_theory_account(text,text) to anon, authenticated;

commit;

notify pgrst, 'reload schema';

select
  to_regprocedure('public.app_public_theory_register(text,text,text,text)') as dang_ky,
  to_regprocedure('public.app_admin_list_public_theory_accounts(text)') as quan_ly_admin,
  to_regprocedure('public.app_public_theory_save_progress(text,jsonb)') as dong_bo_tien_do;
