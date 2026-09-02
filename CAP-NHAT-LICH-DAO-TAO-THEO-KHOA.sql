-- Lịch đào tạo theo Khóa học
-- Admin nhập một lần; toàn bộ học viên đang thuộc khóa và học viên được thêm sau này
-- đều nhận lịch chung. Các buổi cá nhân lặp lại vẫn được giữ nguyên.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon, authenticated;
grant usage on schema private to service_role;

create table if not exists private.app_course_schedules (
  course_key text primary key,
  course_name text not null,
  schedule jsonb not null default '{}'::jsonb,
  updated_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_course_schedules_key_not_blank check (btrim(course_key) <> ''),
  constraint app_course_schedules_name_not_blank check (btrim(course_name) <> ''),
  constraint app_course_schedules_schedule_object check (jsonb_typeof(schedule) = 'object')
);

alter table private.app_course_schedules enable row level security;
revoke all on table private.app_course_schedules from public, anon, authenticated;
grant select, insert, update, delete on table private.app_course_schedules to service_role;

create index if not exists app_course_schedules_updated_by_idx
on private.app_course_schedules(updated_by);

create or replace function private.app_course_key(p_course text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $function$
  select lower(regexp_replace(btrim(coalesce(p_course, '')), '[[:space:]]+', ' ', 'g'));
$function$;

create index if not exists students_active_course_key_idx
on public.students (private.app_course_key(course))
where deleted_at is null and private.app_course_key(course) <> '';

create or replace function private.app_pick_jsonb_text(p_value jsonb, p_keys text[])
returns jsonb
language sql
immutable
parallel safe
set search_path = ''
as $function$
  select coalesce(jsonb_object_agg(item.key, to_jsonb(item.value)), '{}'::jsonb)
  from jsonb_each_text(
    case when jsonb_typeof(p_value) = 'object' then p_value else '{}'::jsonb end
  ) as item
  where item.key = any(coalesce(p_keys, array[]::text[]))
    and btrim(item.value) <> '';
$function$;

create or replace function private.app_strip_student_schedule(p_notes text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $function$
  select btrim(regexp_replace(
    coalesce(p_notes, ''),
    E'(\\n\\n)?\\[\\[HV_SCHEDULE_V1:[A-Za-z0-9+/=]+\\]\\][[:space:]]*$',
    '',
    'g'
  ));
$function$;

create or replace function private.app_schedule_token(p_schedule jsonb)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $function$
  select '[[HV_SCHEDULE_V1:' ||
    regexp_replace(
      encode(convert_to(coalesce(p_schedule, '{}'::jsonb)::text, 'UTF8'), 'base64'),
      '[[:space:]]',
      '',
      'g'
    ) || ']]';
$function$;

create or replace function private.app_merge_course_schedule(
  p_notes text,
  p_schedule jsonb,
  p_license_class text,
  p_course_key text,
  p_course_name text
)
returns text
language plpgsql
volatile
set search_path = 'public', 'private', 'pg_temp'
as $function$
declare
  v_clean text := private.app_strip_student_schedule(p_notes);
  v_existing jsonb := public.app_schedule_payload(p_notes);
  v_existing_dates jsonb;
  v_existing_locations jsonb;
  v_course_dates jsonb;
  v_course_locations jsonb;
  v_personal_dates jsonb;
  v_personal_locations jsonb;
  v_dates jsonb;
  v_locations jsonb;
  v_payload jsonb;
  v_note text;
  v_license text := lower(btrim(coalesce(p_license_class, '')));
begin
  v_existing_dates := case
    when jsonb_typeof(v_existing->'dates') = 'object' then v_existing->'dates'
    else '{}'::jsonb
  end;
  v_existing_locations := case
    when jsonb_typeof(v_existing->'locations') = 'object' then v_existing->'locations'
    else '{}'::jsonb
  end;

  -- Các ca riêng của từng học viên không bị lịch chung ghi đè.
  v_personal_dates := private.app_pick_jsonb_text(
    v_existing_dates,
    array['familiar', 'dat_practice', 'practice']
  );
  v_personal_locations := private.app_pick_jsonb_text(
    v_existing_locations,
    array['familiar', 'dat_practice', 'practice']
  );

  select coalesce(jsonb_object_agg(item.key, item.value), '{}'::jsonb)
  into v_personal_locations
  from jsonb_each(v_personal_locations) as item
  where v_personal_dates ? item.key;

  -- Các mốc cố định được quản lý tập trung ở cấp khóa học.
  v_course_dates := private.app_pick_jsonb_text(
    p_schedule->'dates',
    array[
      'online_start', 'online_end', 'cabin',
      'dat_auto_start', 'dat_auto_end',
      'dat_manual_start', 'dat_manual_end',
      'graduation', 'exam'
    ]
  );
  v_course_locations := private.app_pick_jsonb_text(
    p_schedule->'locations',
    array[
      'online_start', 'online_end', 'cabin',
      'dat_auto_start', 'dat_auto_end',
      'dat_manual_start', 'dat_manual_end',
      'graduation', 'exam'
    ]
  );

  -- Phân lịch DAT đúng theo hạng bằng của từng học viên trong cùng khóa.
  if v_license like '%số tự động%' then
    v_course_dates := v_course_dates - array['dat_manual_start', 'dat_manual_end']::text[];
    v_course_locations := v_course_locations - array['dat_manual_start', 'dat_manual_end']::text[];
  elsif v_license like '%số cơ khí%' then
    null;
  else
    v_course_dates := v_course_dates - array[
      'dat_auto_start', 'dat_auto_end', 'dat_manual_start', 'dat_manual_end'
    ]::text[];
    v_course_locations := v_course_locations - array[
      'dat_auto_start', 'dat_auto_end', 'dat_manual_start', 'dat_manual_end'
    ]::text[];
  end if;

  select coalesce(jsonb_object_agg(item.key, item.value), '{}'::jsonb)
  into v_course_locations
  from jsonb_each(v_course_locations) as item
  where v_course_dates ? item.key;

  v_dates := coalesce(v_personal_dates, '{}'::jsonb) || coalesce(v_course_dates, '{}'::jsonb);
  v_locations := coalesce(v_personal_locations, '{}'::jsonb) || coalesce(v_course_locations, '{}'::jsonb);
  v_note := left(btrim(coalesce(p_schedule->>'note', '')), 1000);

  if v_dates = '{}'::jsonb and v_note = '' then
    return v_clean;
  end if;

  v_payload := jsonb_build_object(
    'version', 2,
    'source', case
      when coalesce(private.app_course_key(p_course_key), '') = '' then 'personal'
      else 'course'
    end,
    'courseKey', private.app_course_key(p_course_key),
    'courseName', btrim(coalesce(p_course_name, '')),
    'dates', v_dates,
    'locations', v_locations,
    'note', v_note,
    'updatedAt', coalesce(
      nullif(p_schedule->>'updatedAt', ''),
      to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
    )
  );

  return case when v_clean = '' then '' else v_clean || E'\n\n' end
    || private.app_schedule_token(v_payload);
end;
$function$;

create or replace function private.app_clear_course_schedule(p_notes text, p_license_class text)
returns text
language sql
volatile
set search_path = 'public', 'private', 'pg_temp'
as $function$
  select private.app_merge_course_schedule(
    p_notes,
    '{}'::jsonb,
    p_license_class,
    '',
    ''
  );
$function$;

create or replace function public.app_admin_list_course_schedules(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'private', 'extensions', 'pg_temp'
as $function$
declare
  v_result jsonb;
begin
  perform public.app_require_admin(p_token);

  select coalesce(jsonb_agg(
    jsonb_build_object(
      'course_key', grouped.course_key,
      'course', grouped.course_name,
      'student_count', grouped.student_count,
      'license_classes', grouped.license_classes,
      'schedule', grouped.schedule,
      'has_schedule', grouped.schedule is not null,
      'updated_at', grouped.updated_at
    ) order by lower(grouped.course_name)
  ), '[]'::jsonb)
  into v_result
  from (
    select
      private.app_course_key(student.course) as course_key,
      min(btrim(student.course)) as course_name,
      count(*)::integer as student_count,
      array_agg(distinct student.license_class order by student.license_class) as license_classes,
      course_schedule.schedule,
      course_schedule.updated_at
    from public.students as student
    left join private.app_course_schedules as course_schedule
      on course_schedule.course_key = private.app_course_key(student.course)
    where student.deleted_at is null
      and private.app_course_key(student.course) <> ''
    group by
      private.app_course_key(student.course),
      course_schedule.schedule,
      course_schedule.updated_at
  ) as grouped;

  return v_result;
end;
$function$;

create or replace function public.app_admin_save_course_schedule(
  p_token text,
  p_course text,
  p_schedule jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'private', 'extensions', 'pg_temp'
as $function$
declare
  v_me jsonb;
  v_course_key text;
  v_course_name text;
  v_member_count integer;
  v_updated_count integer := 0;
  v_dates jsonb;
  v_locations jsonb;
  v_schedule jsonb;
  v_note text;
begin
  v_me := public.app_require_admin(p_token);
  v_course_key := private.app_course_key(p_course);

  if v_course_key = '' then
    raise exception 'Vui lòng chọn khóa học.';
  end if;
  if p_schedule is null or jsonb_typeof(p_schedule) <> 'object' then
    raise exception 'Dữ liệu lịch đào tạo chưa hợp lệ.';
  end if;

  select min(btrim(student.course)), count(*)::integer
  into v_course_name, v_member_count
  from public.students as student
  where student.deleted_at is null
    and private.app_course_key(student.course) = v_course_key;

  if coalesce(v_member_count, 0) = 0 then
    raise exception 'Không tìm thấy học viên trong khóa học này.';
  end if;

  v_dates := private.app_pick_jsonb_text(
    p_schedule->'dates',
    array[
      'online_start', 'online_end', 'cabin',
      'dat_auto_start', 'dat_auto_end',
      'dat_manual_start', 'dat_manual_end',
      'graduation', 'exam'
    ]
  );
  v_locations := private.app_pick_jsonb_text(
    p_schedule->'locations',
    array[
      'online_start', 'online_end', 'cabin',
      'dat_auto_start', 'dat_auto_end',
      'dat_manual_start', 'dat_manual_end',
      'graduation', 'exam'
    ]
  );

  if v_dates = '{}'::jsonb then
    raise exception 'Vui lòng nhập ít nhất một mốc đào tạo.';
  end if;

  if (v_dates ? 'online_start') <> (v_dates ? 'online_end') then
    raise exception 'Vui lòng nhập đủ ngày bắt đầu và kết thúc lý thuyết online.';
  end if;
  if (v_dates ? 'dat_auto_start') <> (v_dates ? 'dat_auto_end') then
    raise exception 'Vui lòng nhập đủ ngày bắt đầu và kết thúc DAT số tự động.';
  end if;
  if (v_dates ? 'dat_manual_start') <> (v_dates ? 'dat_manual_end') then
    raise exception 'Vui lòng nhập đủ ngày bắt đầu và kết thúc DAT số cơ khí.';
  end if;

  begin
    if v_dates ? 'online_start'
       and (v_dates->>'online_end')::date < (v_dates->>'online_start')::date then
      raise exception 'Ngày kết thúc lý thuyết online không được trước ngày bắt đầu.';
    end if;
    if v_dates ? 'dat_auto_start'
       and (v_dates->>'dat_auto_end')::timestamp < (v_dates->>'dat_auto_start')::timestamp then
      raise exception 'Ngày kết thúc DAT số tự động không được trước ngày bắt đầu.';
    end if;
    if v_dates ? 'dat_manual_start'
       and (v_dates->>'dat_manual_end')::timestamp < (v_dates->>'dat_manual_start')::timestamp then
      raise exception 'Ngày kết thúc DAT số cơ khí không được trước ngày bắt đầu.';
    end if;
  exception
    when invalid_datetime_format or datetime_field_overflow then
      raise exception 'Một hoặc nhiều ngày trong lịch đào tạo chưa đúng định dạng.';
  end;

  select coalesce(jsonb_object_agg(item.key, item.value), '{}'::jsonb)
  into v_locations
  from jsonb_each(v_locations) as item
  where v_dates ? item.key;

  v_note := left(btrim(coalesce(p_schedule->>'note', '')), 1000);
  v_schedule := jsonb_build_object(
    'version', 2,
    'source', 'course',
    'courseKey', v_course_key,
    'courseName', v_course_name,
    'dates', v_dates,
    'locations', v_locations,
    'note', v_note,
    'updatedAt', to_char(clock_timestamp() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
  );

  insert into private.app_course_schedules(
    course_key, course_name, schedule, updated_by, created_at, updated_at
  ) values (
    v_course_key, v_course_name, v_schedule, (v_me->>'id')::uuid, now(), now()
  )
  on conflict (course_key) do update
  set course_name = excluded.course_name,
      schedule = excluded.schedule,
      updated_by = excluded.updated_by,
      updated_at = now();

  with desired as (
    select
      student.id,
      private.app_merge_course_schedule(
        student.notes,
        v_schedule,
        student.license_class,
        v_course_key,
        v_course_name
      ) as new_notes
    from public.students as student
    where student.deleted_at is null
      and private.app_course_key(student.course) = v_course_key
  ), updated as (
    update public.students as student
    set notes = desired.new_notes,
        updated_at = now()
    from desired
    where student.id = desired.id
      and student.notes is distinct from desired.new_notes
    returning student.id
  )
  select count(*)::integer into v_updated_count from updated;

  return jsonb_build_object(
    'course_key', v_course_key,
    'course', v_course_name,
    'student_count', v_member_count,
    'updated_count', v_updated_count,
    'schedule', v_schedule
  );
end;
$function$;

create or replace function public.app_admin_delete_course_schedule(
  p_token text,
  p_course text
)
returns jsonb
language plpgsql
security definer
set search_path = 'public', 'private', 'extensions', 'pg_temp'
as $function$
declare
  v_course_key text;
  v_course_name text;
  v_member_count integer;
  v_updated_count integer := 0;
begin
  perform public.app_require_admin(p_token);
  v_course_key := private.app_course_key(p_course);

  if v_course_key = '' then
    raise exception 'Vui lòng chọn khóa học.';
  end if;

  select min(btrim(student.course)), count(*)::integer
  into v_course_name, v_member_count
  from public.students as student
  where student.deleted_at is null
    and private.app_course_key(student.course) = v_course_key;

  if coalesce(v_member_count, 0) = 0 then
    raise exception 'Không tìm thấy học viên trong khóa học này.';
  end if;

  delete from private.app_course_schedules
  where course_key = v_course_key;

  with desired as (
    select
      student.id,
      private.app_clear_course_schedule(student.notes, student.license_class) as new_notes
    from public.students as student
    where student.deleted_at is null
      and private.app_course_key(student.course) = v_course_key
  ), updated as (
    update public.students as student
    set notes = desired.new_notes,
        updated_at = now()
    from desired
    where student.id = desired.id
      and student.notes is distinct from desired.new_notes
    returning student.id
  )
  select count(*)::integer into v_updated_count from updated;

  return jsonb_build_object(
    'course_key', v_course_key,
    'course', v_course_name,
    'student_count', v_member_count,
    'updated_count', v_updated_count,
    'deleted', true
  );
end;
$function$;

create or replace function private.app_sync_student_course_schedule()
returns trigger
language plpgsql
security definer
set search_path = 'public', 'private', 'extensions', 'pg_temp'
as $function$
declare
  v_new_key text := private.app_course_key(new.course);
  v_old_key text := case
    when tg_op = 'UPDATE' then private.app_course_key(old.course)
    else ''
  end;
  v_schedule jsonb;
  v_course_name text;
  v_old_had_schedule boolean := false;
begin
  if v_new_key <> '' then
    select course_schedule.schedule, course_schedule.course_name
    into v_schedule, v_course_name
    from private.app_course_schedules as course_schedule
    where course_schedule.course_key = v_new_key;

    if found then
      new.notes := private.app_merge_course_schedule(
        new.notes,
        v_schedule,
        new.license_class,
        v_new_key,
        v_course_name
      );
      return new;
    end if;
  end if;

  if tg_op = 'UPDATE'
     and v_old_key is distinct from v_new_key
     and v_old_key <> '' then
    select exists(
      select 1
      from private.app_course_schedules as course_schedule
      where course_schedule.course_key = v_old_key
    ) into v_old_had_schedule;

    if v_old_had_schedule then
      new.notes := private.app_clear_course_schedule(new.notes, new.license_class);
    end if;
  end if;

  return new;
end;
$function$;

-- Giữ tương thích với giao diện cũ: nếu lưu theo một học viên có Khóa học,
-- máy chủ vẫn chuyển thao tác đó thành cập nhật toàn khóa.
create or replace function public.app_admin_save_student_schedule(
  p_token text,
  p_student_id text,
  p_notes text
)
returns boolean
language plpgsql
security definer
set search_path = 'public', 'private', 'extensions', 'pg_temp'
as $function$
declare
  v_student public.students;
  v_schedule jsonb;
begin
  perform public.app_require_admin(p_token);

  select * into v_student
  from public.students
  where id::text = btrim(coalesce(p_student_id, ''))
    and deleted_at is null;

  if not found then
    raise exception 'Không tìm thấy hồ sơ học viên.';
  end if;

  if private.app_course_key(v_student.course) <> '' then
    v_schedule := public.app_schedule_payload(p_notes);
    if v_schedule = '{}'::jsonb then
      perform public.app_admin_delete_course_schedule(p_token, v_student.course);
    else
      perform public.app_admin_save_course_schedule(p_token, v_student.course, v_schedule);
    end if;
    return true;
  end if;

  update public.students
  set notes = coalesce(p_notes, ''), updated_at = now()
  where id = v_student.id;

  return true;
end;
$function$;

drop trigger if exists app_sync_student_course_schedule_trigger on public.students;
create trigger app_sync_student_course_schedule_trigger
before insert or update of course, license_class on public.students
for each row
execute function private.app_sync_student_course_schedule();

revoke execute on function private.app_course_key(text) from public, anon, authenticated;
revoke execute on function private.app_pick_jsonb_text(jsonb, text[]) from public, anon, authenticated;
revoke execute on function private.app_strip_student_schedule(text) from public, anon, authenticated;
revoke execute on function private.app_schedule_token(jsonb) from public, anon, authenticated;
revoke execute on function private.app_merge_course_schedule(text, jsonb, text, text, text) from public, anon, authenticated;
revoke execute on function private.app_clear_course_schedule(text, text) from public, anon, authenticated;
revoke execute on function private.app_sync_student_course_schedule() from public, anon, authenticated;

-- Ứng dụng đang dùng phiên đăng nhập riêng (p_token), nên anon chỉ được quyền gọi
-- các cổng RPC; mỗi cổng luôn kiểm tra app_require_admin trước khi đọc/ghi dữ liệu.
revoke execute on function public.app_admin_list_course_schedules(text) from public, anon, authenticated;
revoke execute on function public.app_admin_save_course_schedule(text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.app_admin_delete_course_schedule(text, text) from public, anon, authenticated;
grant execute on function public.app_admin_list_course_schedules(text) to anon, service_role;
grant execute on function public.app_admin_save_course_schedule(text, text, jsonb) to anon, service_role;
grant execute on function public.app_admin_delete_course_schedule(text, text) to anon, service_role;

notify pgrst, 'reload schema';
