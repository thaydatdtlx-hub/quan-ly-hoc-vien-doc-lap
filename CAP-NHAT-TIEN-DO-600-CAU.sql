-- Đồng bộ tiến độ học 600 câu theo tài khoản học viên.
-- Chạy toàn bộ file này trong Supabase SQL Editor.

begin;

create table if not exists public.app_student_theory_progress (
  student_id uuid primary key references public.students(id) on delete cascade,
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

create table if not exists public.app_student_exam_attempts (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  license_class text not null check (license_class in ('A1', 'A', 'B', 'C1')),
  score integer not null check (score >= 0),
  total integer not null check (total in (25, 30, 35)),
  passed boolean not null,
  critical_correct boolean not null,
  elapsed_seconds integer not null default 0 check (elapsed_seconds >= 0),
  submitted_at timestamptz not null default now()
);

create index if not exists app_student_exam_attempts_student_date_idx
  on public.app_student_exam_attempts(student_id, submitted_at desc);

alter table public.app_student_theory_progress enable row level security;
alter table public.app_student_exam_attempts enable row level security;
revoke all on public.app_student_theory_progress from anon, authenticated;
revoke all on public.app_student_exam_attempts from anon, authenticated;

create or replace function public.app_student_get_theory_progress(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_student_id uuid;
  v_result jsonb;
begin
  v_me := public.app_student_me(p_token);
  v_student_id := (v_me->>'student_id')::uuid;

  select jsonb_build_object(
    'student_id', s.id,
    'student_name', s.name,
    'student_code', s.student_code,
    'license_class', s.license_class,
    'progress_data', coalesce(
      p.progress_data,
      '{"answers":{},"bookmarks":[],"lastId":1}'::jsonb
    ),
    'answered_count', coalesce(p.answered_count, 0),
    'correct_count', coalesce(p.correct_count, 0),
    'wrong_count', coalesce(p.wrong_count, 0),
    'bookmarks_count', coalesce(p.bookmarks_count, 0),
    'last_question_id', coalesce(p.last_question_id, 1),
    'last_activity', p.last_activity,
    'exam_count', (
      select count(*)
      from public.app_student_exam_attempts e
      where e.student_id = s.id
    ),
    'passed_exam_count', (
      select count(*)
      from public.app_student_exam_attempts e
      where e.student_id = s.id and e.passed
    ),
    'best_score', (
      select e.score
      from public.app_student_exam_attempts e
      where e.student_id = s.id
      order by (e.score::numeric / nullif(e.total, 0)) desc, e.submitted_at desc
      limit 1
    ),
    'best_total', (
      select e.total
      from public.app_student_exam_attempts e
      where e.student_id = s.id
      order by (e.score::numeric / nullif(e.total, 0)) desc, e.submitted_at desc
      limit 1
    ),
    'latest_exam', (
      select jsonb_build_object(
        'id', e.id,
        'license_class', e.license_class,
        'score', e.score,
        'total', e.total,
        'passed', e.passed,
        'critical_correct', e.critical_correct,
        'elapsed_seconds', e.elapsed_seconds,
        'submitted_at', e.submitted_at
      )
      from public.app_student_exam_attempts e
      where e.student_id = s.id
      order by e.submitted_at desc
      limit 1
    )
  )
  into v_result
  from public.students s
  left join public.app_student_theory_progress p on p.student_id = s.id
  where s.id = v_student_id;

  if v_result is null then
    raise exception 'Không tìm thấy hồ sơ học viên được liên kết.';
  end if;

  return v_result;
end;
$$;

create or replace function public.app_student_save_theory_progress(
  p_token text,
  p_progress jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_student_id uuid;
  v_answers jsonb;
  v_bookmarks jsonb;
  v_answered integer;
  v_correct integer;
  v_wrong integer;
  v_bookmarks_count integer;
  v_last integer;
begin
  v_me := public.app_student_me(p_token);
  v_student_id := (v_me->>'student_id')::uuid;
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
    select 1
    from jsonb_each_text(v_answers) item
    where item.key !~ '^[1-9][0-9]{0,2}$'
      or item.key::integer not between 1 and 600
      or item.value !~ '^[1-4]$'
  ) then
    raise exception 'Danh sách câu đã học vượt phạm vi bộ 600 câu.';
  end if;
  if v_bookmarks_count > 600 or exists (
    select 1
    from jsonb_array_elements_text(v_bookmarks) item(value)
    where item.value !~ '^[1-9][0-9]{0,2}$'
      or item.value::integer not between 1 and 600
  ) then
    raise exception 'Danh sách câu đánh dấu vượt phạm vi bộ 600 câu.';
  end if;
  v_correct := greatest(
    0,
    least(v_answered, coalesce(nullif(p_progress->>'correct_count', '')::integer, 0))
  );
  v_wrong := v_answered - v_correct;
  v_last := greatest(
    1,
    least(600, coalesce(nullif(p_progress->>'lastId', '')::integer, 1))
  );

  insert into public.app_student_theory_progress(
    student_id,
    progress_data,
    answered_count,
    correct_count,
    wrong_count,
    bookmarks_count,
    last_question_id,
    last_activity,
    updated_at
  )
  values (
    v_student_id,
    jsonb_build_object(
      'answers', v_answers,
      'bookmarks', v_bookmarks,
      'lastId', v_last
    ),
    v_answered,
    v_correct,
    v_wrong,
    v_bookmarks_count,
    v_last,
    now(),
    now()
  )
  on conflict (student_id) do update
  set progress_data = excluded.progress_data,
      answered_count = excluded.answered_count,
      correct_count = excluded.correct_count,
      wrong_count = excluded.wrong_count,
      bookmarks_count = excluded.bookmarks_count,
      last_question_id = excluded.last_question_id,
      last_activity = excluded.last_activity,
      updated_at = excluded.updated_at;

  return jsonb_build_object(
    'student_id', v_student_id,
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

create or replace function public.app_student_save_exam_attempt(
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
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_student_id uuid;
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
  v_student_id := (v_me->>'student_id')::uuid;
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

  insert into public.app_student_exam_attempts(
    student_id,
    license_class,
    score,
    total,
    passed,
    critical_correct,
    elapsed_seconds,
    submitted_at
  )
  values (
    v_student_id,
    v_class,
    v_score,
    v_total,
    v_passed,
    coalesce(p_critical_correct, false),
    v_elapsed,
    v_submitted_at
  )
  returning id into v_id;

  insert into public.app_student_theory_progress(student_id, last_activity, updated_at)
  values (v_student_id, v_submitted_at, v_submitted_at)
  on conflict (student_id) do update
  set last_activity = excluded.last_activity,
      updated_at = excluded.updated_at;

  delete from public.app_student_exam_attempts old_attempt
  where old_attempt.student_id = v_student_id
    and old_attempt.id in (
      select e.id
      from public.app_student_exam_attempts e
      where e.student_id = v_student_id
      order by e.submitted_at desc
      offset 200
    );

  return jsonb_build_object(
    'id', v_id,
    'student_id', v_student_id,
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
        'student_id', s.id,
        'student_name', s.name,
        'student_code', s.student_code,
        'license_class', s.license_class,
        'account_username', a.username,
        'account_active', coalesce(a.active, false),
        'answered_count', coalesce(p.answered_count, 0),
        'correct_count', coalesce(p.correct_count, 0),
        'wrong_count', coalesce(p.wrong_count, 0),
        'bookmarks_count', coalesce(p.bookmarks_count, 0),
        'last_question_id', coalesce(p.last_question_id, 1),
        'last_activity', p.last_activity,
        'exam_count', coalesce(ex.exam_count, 0),
        'passed_exam_count', coalesce(ex.passed_exam_count, 0),
        'best_score', ex.best_score,
        'best_total', ex.best_total,
        'latest_exam', ex.latest_exam
      )
      order by p.last_activity desc nulls last, lower(s.name)
    )
    from public.students s
    left join public.app_student_accounts a on a.student_id = s.id::text
    left join public.app_student_theory_progress p on p.student_id = s.id
    left join lateral (
      select
        count(*)::integer as exam_count,
        (count(*) filter (where e.passed))::integer as passed_exam_count,
        (
          select e2.score
          from public.app_student_exam_attempts e2
          where e2.student_id = s.id
          order by (e2.score::numeric / nullif(e2.total, 0)) desc, e2.submitted_at desc
          limit 1
        ) as best_score,
        (
          select e2.total
          from public.app_student_exam_attempts e2
          where e2.student_id = s.id
          order by (e2.score::numeric / nullif(e2.total, 0)) desc, e2.submitted_at desc
          limit 1
        ) as best_total,
        (
          select jsonb_build_object(
            'license_class', e3.license_class,
            'score', e3.score,
            'total', e3.total,
            'passed', e3.passed,
            'critical_correct', e3.critical_correct,
            'elapsed_seconds', e3.elapsed_seconds,
            'submitted_at', e3.submitted_at
          )
          from public.app_student_exam_attempts e3
          where e3.student_id = s.id
          order by e3.submitted_at desc
          limit 1
        ) as latest_exam
      from public.app_student_exam_attempts e
      where e.student_id = s.id
    ) ex on true
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_admin_get_theory_detail(
  p_token text,
  p_student_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_student_id uuid;
  v_result jsonb;
begin
  perform public.app_require_admin(p_token);

  begin
    v_student_id := btrim(coalesce(p_student_id, ''))::uuid;
  exception
    when invalid_text_representation then
      raise exception 'Mã học viên không hợp lệ.';
  end;

  select jsonb_build_object(
    'student_id', s.id,
    'student_name', s.name,
    'student_code', s.student_code,
    'license_class', s.license_class,
    'account_username', a.username,
    'answered_count', coalesce(p.answered_count, 0),
    'correct_count', coalesce(p.correct_count, 0),
    'wrong_count', coalesce(p.wrong_count, 0),
    'bookmarks_count', coalesce(p.bookmarks_count, 0),
    'last_question_id', coalesce(p.last_question_id, 1),
    'last_activity', p.last_activity,
    'attempts', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', x.id,
          'license_class', x.license_class,
          'score', x.score,
          'total', x.total,
          'passed', x.passed,
          'critical_correct', x.critical_correct,
          'elapsed_seconds', x.elapsed_seconds,
          'submitted_at', x.submitted_at
        )
        order by x.submitted_at desc
      )
      from (
        select e.*
        from public.app_student_exam_attempts e
        where e.student_id = v_student_id
        order by e.submitted_at desc
        limit 50
      ) x
    ), '[]'::jsonb)
  )
  into v_result
  from public.students s
  left join public.app_student_accounts a on a.student_id = s.id::text
  left join public.app_student_theory_progress p on p.student_id = s.id
  where s.id = v_student_id;

  if v_result is null then
    raise exception 'Không tìm thấy hồ sơ học viên.';
  end if;

  return v_result;
end;
$$;

revoke all on function public.app_student_get_theory_progress(text) from public;
revoke all on function public.app_student_save_theory_progress(text,jsonb) from public;
revoke all on function public.app_student_save_exam_attempt(text,text,integer,integer,boolean,integer) from public;
revoke all on function public.app_admin_list_theory_progress(text) from public;
revoke all on function public.app_admin_get_theory_detail(text,text) from public;

grant execute on function public.app_student_get_theory_progress(text) to anon, authenticated;
grant execute on function public.app_student_save_theory_progress(text,jsonb) to anon, authenticated;
grant execute on function public.app_student_save_exam_attempt(text,text,integer,integer,boolean,integer) to anon, authenticated;
grant execute on function public.app_admin_list_theory_progress(text) to anon, authenticated;
grant execute on function public.app_admin_get_theory_detail(text,text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
