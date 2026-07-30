-- ============================================================
-- NHẮC LỊCH ĐÀO TẠO TỰ ĐỘNG
-- - Nhắc học viên, Admin và tài khoản quản lý trước buổi học 24 giờ.
-- - Báo học viên khi lịch được duyệt, thay đổi hoặc hủy.
-- - Báo Admin/tài khoản quản lý khi có yêu cầu đăng ký mới.
-- - Đồng bộ trạng thái đã đọc giữa các thiết bị.
-- Chạy toàn bộ file này 1 lần trong Supabase SQL Editor.
-- ============================================================

begin;

create table if not exists public.app_notifications (
  id uuid primary key default extensions.gen_random_uuid(),
  recipient_kind text not null check (recipient_kind in ('manager', 'student')),
  recipient_id uuid not null,
  notification_key text not null,
  tone text not null default 'blue',
  icon text not null default '🔔',
  title text not null,
  body text not null default '',
  href text not null default '',
  action_label text not null default '',
  event_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (recipient_kind, recipient_id, notification_key)
);

create index if not exists app_notifications_recipient_idx
  on public.app_notifications(recipient_kind, recipient_id, created_at desc);

create index if not exists app_notifications_unread_idx
  on public.app_notifications(recipient_kind, recipient_id)
  where read_at is null;

alter table public.app_notifications enable row level security;
revoke all on public.app_notifications from anon, authenticated;

create or replace function public.app_schedule_payload(p_notes text)
returns jsonb
language plpgsql
immutable
set search_path = public, extensions, pg_temp
as $$
declare
  v_encoded text;
begin
  v_encoded := (regexp_match(
    coalesce(p_notes, ''),
    '\[\[HV_SCHEDULE_V1:([A-Za-z0-9+/=]+)\]\]\s*$'
  ))[1];
  if v_encoded is null then
    return '{}'::jsonb;
  end if;
  return convert_from(decode(v_encoded, 'base64'), 'UTF8')::jsonb;
exception
  when others then
    return '{}'::jsonb;
end;
$$;

create or replace function public.app_schedule_time(p_value text)
returns timestamptz
language plpgsql
immutable
set search_path = public, extensions, pg_temp
as $$
begin
  if nullif(btrim(coalesce(p_value, '')), '') is null then
    return null;
  end if;
  if p_value ~ '(Z|[+-][0-9]{2}:[0-9]{2})$' then
    return p_value::timestamptz;
  end if;
  return p_value::timestamp at time zone 'Asia/Ho_Chi_Minh';
exception
  when others then
    return null;
end;
$$;

create or replace function public.app_schedule_label(p_type text)
returns text
language sql
immutable
as $$
  select case p_type
    when 'online' then 'Học lý thuyết online'
    when 'familiar' then 'Thực hành làm quen xe'
    when 'dat_practice' then 'Thực hành DAT'
    when 'cabin' then 'Học cabin'
    when 'practice' then 'Học sa hình'
    when 'dat_auto_start' then 'Bắt đầu DAT số tự động'
    when 'dat_auto_end' then 'Kết thúc DAT số tự động'
    when 'dat_manual_start' then 'Bắt đầu DAT số cơ khí'
    when 'dat_manual_end' then 'Kết thúc DAT số cơ khí'
    when 'graduation' then 'Thi tốt nghiệp'
    when 'exam' then 'Thi sát hạch'
    else 'Lịch đào tạo'
  end;
$$;

create or replace function public.app_notify_student(
  p_student_id uuid,
  p_key text,
  p_tone text,
  p_icon text,
  p_title text,
  p_body text,
  p_href text default '/lich-dao-tao.html',
  p_action text default 'Xem lịch chi tiết',
  p_event_at timestamptz default null
)
returns void
language sql
security definer
set search_path = public, extensions, pg_temp
as $$
  insert into public.app_notifications(
    recipient_kind, recipient_id, notification_key, tone, icon,
    title, body, href, action_label, event_at
  )
  select
    'student', account.id, p_key, coalesce(p_tone, 'blue'),
    coalesce(p_icon, '🔔'), p_title, coalesce(p_body, ''),
    coalesce(p_href, ''), coalesce(p_action, ''), p_event_at
  from public.app_student_accounts account
  where account.student_id = p_student_id::text
    and account.active
  on conflict (recipient_kind, recipient_id, notification_key) do nothing;
$$;

create or replace function public.app_notify_managers(
  p_student_id uuid,
  p_key text,
  p_tone text,
  p_icon text,
  p_title text,
  p_body text,
  p_href text default '/lich-dao-tao.html',
  p_action text default 'Mở lịch đào tạo',
  p_event_at timestamptz default null
)
returns void
language sql
security definer
set search_path = public, extensions, pg_temp
as $$
  insert into public.app_notifications(
    recipient_kind, recipient_id, notification_key, tone, icon,
    title, body, href, action_label, event_at
  )
  select
    'manager', manager.id, p_key, coalesce(p_tone, 'blue'),
    coalesce(p_icon, '🔔'), p_title, coalesce(p_body, ''),
    coalesce(p_href, ''), coalesce(p_action, ''), p_event_at
  from public.app_users manager
  where manager.active
    and (
      manager.role = 'admin'
      or manager.id = (select student.owner_id from public.students student where student.id = p_student_id)
    )
  on conflict (recipient_kind, recipient_id, notification_key) do nothing;
$$;

create or replace function public.app_generate_schedule_reminders()
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_before integer;
  v_student record;
  v_event record;
  v_payload jsonb;
  v_event_at timestamptz;
  v_location text;
  v_label text;
  v_body text;
begin
  select count(*) into v_before from public.app_notifications;

  for v_event in
    select
      session.id,
      session.student_id,
      session.session_type,
      session.starts_at,
      session.location,
      student.name,
      coalesce(slot.instructor_name, '') as instructor_name,
      coalesce(slot.vehicle_plate, '') as vehicle_plate
    from public.student_training_sessions session
    join public.students student on student.id = session.student_id
    left join public.training_slots slot on slot.id = session.slot_id
    where session.starts_at >= now() + interval '23 hours'
      and session.starts_at < now() + interval '25 hours'
      and coalesce(slot.status, 'open') <> 'cancelled'
  loop
    v_label := public.app_schedule_label(v_event.session_type);
    v_body := format(
      '%s lúc %s%s%s%s.',
      v_label,
      to_char(v_event.starts_at at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI ngày DD/MM/YYYY'),
      case when nullif(v_event.location, '') is not null then ' · ' || v_event.location else '' end,
      case when nullif(v_event.instructor_name, '') is not null then ' · GV ' || v_event.instructor_name else '' end,
      case when nullif(v_event.vehicle_plate, '') is not null then ' · Xe ' || v_event.vehicle_plate else '' end
    );

    perform public.app_notify_student(
      v_event.student_id, 'session-24h:' || v_event.id, 'orange', '⏰',
      'Nhắc lịch ngày mai: ' || v_label, v_body,
      '/lich-dao-tao.html', 'Xem lịch chi tiết', v_event.starts_at
    );
    perform public.app_notify_managers(
      v_event.student_id, 'manager-session-24h:' || v_event.id, 'orange', '⏰',
      'Ngày mai: ' || v_event.name || ' · ' || v_label, v_body,
      '/lich-dao-tao.html', 'Mở lịch đào tạo', v_event.starts_at
    );
  end loop;

  for v_student in
    select id, name, notes from public.students
  loop
    v_payload := public.app_schedule_payload(v_student.notes);
    for v_event in
      select key, value
      from jsonb_each_text(coalesce(v_payload->'dates', '{}'::jsonb))
    loop
      v_event_at := public.app_schedule_time(v_event.value);
      if v_event_at is null
         or v_event_at < now() + interval '23 hours'
         or v_event_at >= now() + interval '25 hours' then
        continue;
      end if;

      v_label := public.app_schedule_label(v_event.key);
      v_location := coalesce(v_payload->'locations'->>v_event.key, '');
      v_body := format(
        '%s lúc %s%s.',
        v_label,
        to_char(v_event_at at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI ngày DD/MM/YYYY'),
        case when nullif(v_location, '') is not null then ' · ' || v_location else '' end
      );

      perform public.app_notify_student(
        v_student.id,
        'fixed-24h:' || v_student.id || ':' || v_event.key || ':' || v_event.value,
        'orange', '⏰', 'Nhắc lịch ngày mai: ' || v_label, v_body,
        '/lich-dao-tao.html', 'Xem lịch chi tiết', v_event_at
      );
      perform public.app_notify_managers(
        v_student.id,
        'manager-fixed-24h:' || v_student.id || ':' || v_event.key || ':' || v_event.value,
        'orange', '⏰', 'Ngày mai: ' || v_student.name || ' · ' || v_label, v_body,
        '/lich-dao-tao.html', 'Mở lịch đào tạo', v_event_at
      );
    end loop;
  end loop;

  delete from public.app_notifications
  where created_at < now() - interval '180 days';

  return (select count(*) from public.app_notifications) - v_before;
end;
$$;

create or replace function public.app_list_notifications(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_kind text;
begin
  begin
    v_me := public.app_me(p_token);
    v_kind := 'manager';
  exception
    when others then
      v_me := public.app_student_me(p_token);
      v_kind := 'student';
  end;

  perform public.app_generate_schedule_reminders();

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', notice.id,
        'tone', notice.tone,
        'icon', notice.icon,
        'title', notice.title,
        'body', notice.body,
        'href', notice.href,
        'action', notice.action_label,
        'event_at', notice.event_at,
        'read_at', notice.read_at,
        'created_at', notice.created_at
      )
      order by notice.created_at desc
    )
    from (
      select *
      from public.app_notifications
      where recipient_kind = v_kind
        and recipient_id::text = v_me->>'id'
      order by created_at desc
      limit 60
    ) notice
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_mark_notifications_read(
  p_token text,
  p_ids jsonb
)
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_kind text;
  v_count integer;
begin
  begin
    v_me := public.app_me(p_token);
    v_kind := 'manager';
  exception
    when others then
      v_me := public.app_student_me(p_token);
      v_kind := 'student';
  end;

  update public.app_notifications notice
  set read_at = coalesce(notice.read_at, now())
  where notice.recipient_kind = v_kind
    and notice.recipient_id::text = v_me->>'id'
    and (
      p_ids is null
      or jsonb_typeof(p_ids) <> 'array'
      or jsonb_array_length(p_ids) = 0
      or notice.id::text in (select jsonb_array_elements_text(p_ids))
    );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

create or replace function public.app_training_request_notification()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_name text;
  v_label text;
  v_time text;
begin
  select name into v_name from public.students where id = new.student_id;
  v_label := public.app_schedule_label(new.request_type);
  v_time := to_char(new.requested_at at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI ngày DD/MM/YYYY');

  if tg_op = 'INSERT' then
    perform public.app_notify_managers(
      new.student_id, 'request-new:' || new.id, 'cyan', '✋',
      'Yêu cầu lịch mới: ' || coalesce(v_name, 'Học viên'),
      v_label || ' · ' || v_time,
      '/lich-dao-tao.html#trainingRequests', 'Duyệt yêu cầu', new.requested_at
    );
  elsif new.status is distinct from old.status then
    if new.status = 'approved' then
      perform public.app_notify_student(
        new.student_id, 'request-approved:' || new.id, 'green', '✓',
        'Lịch học đã được Admin duyệt',
        v_label || ' · ' || v_time ||
          case when nullif(new.admin_note, '') is not null then ' · ' || new.admin_note else '' end,
        '/lich-dao-tao.html', 'Xem lịch chính thức', new.requested_at
      );
    elsif new.status = 'rejected' then
      perform public.app_notify_student(
        new.student_id, 'request-rejected:' || new.id, 'red', '!',
        'Yêu cầu lịch chưa được duyệt',
        v_label || case when nullif(new.admin_note, '') is not null then ' · ' || new.admin_note else '' end,
        '/lich-dao-tao.html', 'Xem yêu cầu', new.requested_at
      );
    elsif new.status = 'cancelled' then
      perform public.app_notify_student(
        new.student_id, 'request-cancelled:' || new.id, 'orange', '×',
        'Yêu cầu lịch đã được hủy', v_label || ' · ' || v_time,
        '/lich-dao-tao.html', 'Xem yêu cầu', new.requested_at
      );
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists app_training_request_notification_trigger
  on public.student_training_requests;
create trigger app_training_request_notification_trigger
after insert or update of status on public.student_training_requests
for each row execute function public.app_training_request_notification();

create or replace function public.app_training_session_notification()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_row public.student_training_sessions;
  v_label text;
begin
  v_row := case when tg_op = 'DELETE' then old else new end;
  v_label := public.app_schedule_label(v_row.session_type);

  if tg_op = 'DELETE' then
    perform public.app_notify_student(
      v_row.student_id, 'session-cancelled:' || v_row.id || ':' || extract(epoch from now())::bigint,
      'red', '!', 'Lịch học đã được hủy',
      v_label || ' · ' ||
        to_char(v_row.starts_at at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI ngày DD/MM/YYYY'),
      '/lich-dao-tao.html', 'Xem lịch đào tạo', v_row.starts_at
    );
    return old;
  end if;

  if new.starts_at is distinct from old.starts_at
     or new.location is distinct from old.location
     or new.session_type is distinct from old.session_type then
    perform public.app_notify_student(
      new.student_id, 'session-changed:' || new.id || ':' || extract(epoch from new.updated_at)::bigint,
      'violet', '↻', 'Lịch học đã được thay đổi',
      v_label || ' · ' ||
        to_char(new.starts_at at time zone 'Asia/Ho_Chi_Minh', 'HH24:MI ngày DD/MM/YYYY') ||
        case when nullif(new.location, '') is not null then ' · ' || new.location else '' end,
      '/lich-dao-tao.html', 'Xem lịch mới', new.starts_at
    );
  end if;
  return new;
end;
$$;

drop trigger if exists app_training_session_notification_trigger
  on public.student_training_sessions;
create trigger app_training_session_notification_trigger
after update or delete on public.student_training_sessions
for each row execute function public.app_training_session_notification();

create or replace function public.app_fixed_schedule_notification()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  if public.app_schedule_payload(new.notes) is distinct from public.app_schedule_payload(old.notes) then
    perform public.app_notify_student(
      new.id, 'fixed-changed:' || new.id || ':' || extract(epoch from new.updated_at)::bigint,
      'violet', '↻', 'Lịch đào tạo đã được cập nhật',
      'Trung tâm vừa thay đổi lịch học hoặc lịch thi của anh/chị.',
      '/lich-dao-tao.html', 'Xem lịch mới', null
    );
  end if;
  return new;
end;
$$;

drop trigger if exists app_fixed_schedule_notification_trigger on public.students;
create trigger app_fixed_schedule_notification_trigger
after update of notes on public.students
for each row execute function public.app_fixed_schedule_notification();

revoke all on function public.app_schedule_payload(text) from public;
revoke all on function public.app_schedule_time(text) from public;
revoke all on function public.app_schedule_label(text) from public;
revoke all on function public.app_notify_student(uuid,text,text,text,text,text,text,text,timestamptz) from public;
revoke all on function public.app_notify_managers(uuid,text,text,text,text,text,text,text,timestamptz) from public;
revoke all on function public.app_generate_schedule_reminders() from public;
revoke all on function public.app_training_request_notification() from public;
revoke all on function public.app_training_session_notification() from public;
revoke all on function public.app_fixed_schedule_notification() from public;
revoke all on function public.app_list_notifications(text) from public;
revoke all on function public.app_mark_notifications_read(text,jsonb) from public;
grant execute on function public.app_list_notifications(text) to anon, authenticated;
grant execute on function public.app_mark_notifications_read(text,jsonb) to anon, authenticated;

select public.app_generate_schedule_reminders();
select pg_notify('pgrst', 'reload schema');

commit;

-- Bật tác vụ tự động mỗi 15 phút nếu Supabase Cron khả dụng.
-- Nếu dự án chưa bật Cron, chức năng vẫn chạy mỗi khi người dùng mở thông báo.
do $$
begin
  begin
    execute 'create extension if not exists pg_cron';
  exception
    when others then
      raise notice 'Không thể bật pg_cron: %', sqlerrm;
  end;

  if to_regnamespace('cron') is not null then
    execute $cron$
      select cron.schedule(
        'hv-auto-schedule-reminders',
        '*/15 * * * *',
        'select public.app_generate_schedule_reminders();'
      )
    $cron$;
  end if;
exception
  when others then
    raise notice 'Không thể tạo Cron job; nhắc lịch vẫn chạy khi mở ứng dụng: %', sqlerrm;
end;
$$;

select
  to_regclass('public.app_notifications') as notifications,
  to_regprocedure('public.app_list_notifications(text)') as list_notifications,
  to_regprocedure('public.app_mark_notifications_read(text,jsonb)') as mark_read,
  to_regprocedure('public.app_generate_schedule_reminders()') as generate_reminders;
