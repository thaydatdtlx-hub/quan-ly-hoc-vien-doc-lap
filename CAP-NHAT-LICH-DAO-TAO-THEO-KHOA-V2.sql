-- Bổ sung cho CAP-NHAT-LICH-DAO-TAO-THEO-KHOA.sql
-- Chuẩn hóa khoảng trắng quanh dấu gạch nối để các tên như
-- "K11 - 26B SCK" và "K11-26B SCK" được hiểu là cùng một khóa.
-- Đồng thời bảo đảm lịch chung của khóa luôn được giữ khi hồ sơ/ghi chú thay đổi.

create or replace function private.app_course_key(p_course text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $function$
  select lower(
    regexp_replace(
      regexp_replace(
        translate(btrim(coalesce(p_course, '')), '‐‑‒–—−', '------'),
        '[[:space:]]*-[[:space:]]*',
        '-',
        'g'
      ),
      '[[:space:]]+',
      ' ',
      'g'
    )
  );
$function$;

-- Giữ lại bản lịch được cập nhật gần nhất nếu các khóa cũ sau chuẩn hóa bị trùng.
create temporary table _course_schedule_rekey on commit drop as
select distinct on (private.app_course_key(course_name))
  private.app_course_key(course_name) as course_key,
  course_name,
  schedule,
  updated_by,
  created_at,
  updated_at
from private.app_course_schedules
where private.app_course_key(course_name) <> ''
order by private.app_course_key(course_name), updated_at desc, created_at desc;

truncate table private.app_course_schedules;

insert into private.app_course_schedules(
  course_key, course_name, schedule, updated_by, created_at, updated_at
)
select course_key, course_name, schedule, updated_by, created_at, updated_at
from _course_schedule_rekey;

drop index if exists public.students_active_course_key_idx;
create index students_active_course_key_idx
on public.students (private.app_course_key(course))
where deleted_at is null and private.app_course_key(course) <> '';

create index if not exists app_course_schedules_updated_by_idx
on private.app_course_schedules(updated_by);

alter function private.app_merge_course_schedule(text, jsonb, text, text, text) volatile;
alter function private.app_clear_course_schedule(text, text) volatile;

drop trigger if exists app_sync_student_course_schedule_trigger on public.students;
create trigger app_sync_student_course_schedule_trigger
before insert or update of course, license_class, notes, deleted_at on public.students
for each row
execute function private.app_sync_student_course_schedule();

revoke execute on function public.app_admin_list_course_schedules(text) from authenticated;
revoke execute on function public.app_admin_save_course_schedule(text, text, jsonb) from authenticated;
revoke execute on function public.app_admin_delete_course_schedule(text, text) from authenticated;
grant execute on function public.app_admin_list_course_schedules(text) to anon, service_role;
grant execute on function public.app_admin_save_course_schedule(text, text, jsonb) to anon, service_role;
grant execute on function public.app_admin_delete_course_schedule(text, text) to anon, service_role;

notify pgrst, 'reload schema';
