-- BƯỚC 11: TRUNG TÂM THÔNG BÁO TỰ ĐỘNG
-- Yêu cầu đã chạy các file: nhắc lịch tự động, tiến độ 600 câu, điểm danh và học phí.
-- Chạy toàn bộ file này trong Supabase SQL Editor đúng 1 lần.

begin;

do $$
begin
  if to_regclass('public.app_notifications') is null then raise exception 'Cần chạy CAP-NHAT-NHAC-LICH-TU-DONG.sql trước.'; end if;
  if to_regclass('public.app_attendance_records') is null then raise exception 'Cần chạy CAP-NHAT-DIEM-DANH-BAO-CAO.sql trước.'; end if;
  if to_regclass('public.app_student_exam_attempts') is null then raise exception 'Cần chạy CAP-NHAT-TIEN-DO-600-CAU.sql trước.'; end if;
end;
$$;

alter table public.app_notifications add column if not exists category text not null default 'general';

create or replace function public.app_schedule_label(p_type text)
returns text language sql immutable as $$
  select case p_type
    when 'theory' then 'Học lý thuyết'
    when 'online' then 'Học lý thuyết online'
    when 'familiar' then 'Thực hành làm quen xe'
    when 'dat_practice' then 'Thực hành DAT'
    when 'cabin' then 'Học cabin'
    when 'practice' then 'Học sa hình'
    when 'dat_auto' then 'DAT số tự động'
    when 'dat_manual' then 'DAT số cơ khí'
    when 'dat_auto_start' then 'Bắt đầu DAT số tự động'
    when 'dat_auto_end' then 'Kết thúc DAT số tự động'
    when 'dat_manual_start' then 'Bắt đầu DAT số cơ khí'
    when 'dat_manual_end' then 'Kết thúc DAT số cơ khí'
    when 'graduation' then 'Thi tốt nghiệp'
    when 'exam' then 'Thi sát hạch'
    else 'Lịch đào tạo'
  end;
$$;

create table if not exists public.app_training_hour_targets (
  license_class text not null,
  session_type text not null check (session_type in ('theory','cabin','dat_auto','dat_manual','dat_practice','practice','familiar')),
  required_minutes integer not null check (required_minutes between 0 and 60000),
  updated_by uuid references public.app_users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (license_class, session_type)
);

alter table public.app_training_hour_targets enable row level security;
revoke all on public.app_training_hour_targets from anon, authenticated;

create or replace function public.app_notify_student_v2(
  p_student_id uuid,p_key text,p_category text,p_tone text,p_icon text,p_title text,p_body text,
  p_href text default '/hoc-vien.html',p_action text default 'Xem chi tiết',p_event_at timestamptz default null
)
returns void language sql security definer set search_path=public,extensions,pg_temp as $$
  insert into public.app_notifications(recipient_kind,recipient_id,notification_key,category,tone,icon,title,body,href,action_label,event_at)
  select 'student',account.id,p_key,coalesce(nullif(p_category,''),'general'),coalesce(p_tone,'blue'),coalesce(p_icon,'🔔'),p_title,coalesce(p_body,''),coalesce(p_href,''),coalesce(p_action,''),p_event_at
  from public.app_student_accounts account where account.student_id=p_student_id::text and account.active
  on conflict(recipient_kind,recipient_id,notification_key) do nothing;
$$;

create or replace function public.app_notify_managers_v2(
  p_student_id uuid,p_key text,p_category text,p_tone text,p_icon text,p_title text,p_body text,
  p_href text default '/',p_action text default 'Xem chi tiết',p_event_at timestamptz default null
)
returns void language sql security definer set search_path=public,extensions,pg_temp as $$
  insert into public.app_notifications(recipient_kind,recipient_id,notification_key,category,tone,icon,title,body,href,action_label,event_at)
  select 'manager',manager.id,p_key,coalesce(nullif(p_category,''),'general'),coalesce(p_tone,'blue'),coalesce(p_icon,'🔔'),p_title,coalesce(p_body,''),coalesce(p_href,''),coalesce(p_action,''),p_event_at
  from public.app_users manager where manager.active and (manager.role='admin' or manager.id=(select owner_id from public.students where id=p_student_id))
  on conflict(recipient_kind,recipient_id,notification_key) do nothing;
$$;

-- Các hàm nhắc lịch cũ tiếp tục được dùng bởi trigger/cron, nhưng nay tự gắn
-- đúng nhóm "Lịch học" để bộ lọc trong trung tâm thông báo hoạt động chính xác.
create or replace function public.app_notify_student(
  p_student_id uuid,p_key text,p_tone text,p_icon text,p_title text,p_body text,
  p_href text default '/lich-dao-tao.html',p_action text default 'Xem lịch chi tiết',p_event_at timestamptz default null
)
returns void language sql security definer set search_path=public,extensions,pg_temp as $$
  select public.app_notify_student_v2(p_student_id,p_key,'schedule',p_tone,p_icon,p_title,p_body,p_href,p_action,p_event_at);
$$;

create or replace function public.app_notify_managers(
  p_student_id uuid,p_key text,p_tone text,p_icon text,p_title text,p_body text,
  p_href text default '/lich-dao-tao.html',p_action text default 'Mở lịch đào tạo',p_event_at timestamptz default null
)
returns void language sql security definer set search_path=public,extensions,pg_temp as $$
  select public.app_notify_managers_v2(p_student_id,p_key,'schedule',p_tone,p_icon,p_title,p_body,p_href,p_action,p_event_at);
$$;

update public.app_notifications
set category='schedule'
where category='general'
  and (notification_key like 'request-%'
    or notification_key like 'session-%'
    or notification_key like 'manager-session-%'
    or notification_key like 'fixed-%'
    or notification_key like 'manager-fixed-%');

create or replace function public.app_list_training_hour_targets(p_token text)
returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
begin
  perform public.app_require_admin(p_token);
  return coalesce((select jsonb_agg(to_jsonb(target) order by target.license_class,target.session_type) from public.app_training_hour_targets target),'[]'::jsonb);
end;
$$;

create or replace function public.app_save_training_hour_targets(p_token text,p_license_class text,p_targets jsonb)
returns boolean language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_me jsonb;v_type text;v_minutes integer;v_class text;
begin
  v_me:=public.app_require_admin(p_token);v_class:=btrim(coalesce(p_license_class,''));
  if v_class='' then raise exception 'Vui lòng chọn hạng đào tạo.'; end if;
  foreach v_type in array array['theory','cabin','dat_auto','dat_manual','dat_practice','practice','familiar'] loop
    v_minutes:=greatest(0,least(coalesce((p_targets->>v_type)::integer,0),60000));
    if v_minutes=0 then
      delete from public.app_training_hour_targets where license_class=v_class and session_type=v_type;
      delete from public.app_notifications notice using public.app_student_accounts account,public.students student
      where notice.recipient_kind='student' and notice.recipient_id=account.id and account.student_id=student.id::text
        and student.license_class=v_class and notice.notification_key like 'hours:'||student.id||':'||v_type||':%';
    else insert into public.app_training_hour_targets(license_class,session_type,required_minutes,updated_by,updated_at)
      values(v_class,v_type,v_minutes,(v_me->>'id')::uuid,now())
      on conflict(license_class,session_type) do update set required_minutes=excluded.required_minutes,updated_by=excluded.updated_by,updated_at=now();
    end if;
  end loop;
  insert into public.app_audit_logs(actor_id,actor_username,actor_role,action,entity_type,entity_id,entity_label,details)
  values((v_me->>'id')::uuid,v_me->>'username',v_me->>'role','training_hour_targets_updated','notification_settings',v_class,v_class,coalesce(p_targets,'{}'::jsonb));
  return true;
exception when invalid_text_representation then raise exception 'Định mức giờ không hợp lệ.';
end;
$$;

create or replace function public.app_generate_student_status_notifications()
returns integer language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_before integer;v_student record;v_target record;v_actual integer;v_remaining integer;v_total integer;v_present integer;v_rate integer;v_debt numeric;v_key text;
begin
  select count(*) into v_before from public.app_notifications;
  for v_student in select * from public.students where deleted_at is null loop
    v_debt:=greatest(0,coalesce(v_student.tuition_total,0)-coalesce(v_student.paid,0));
    if v_debt>0 then perform public.app_notify_student_v2(v_student.id,'tuition:'||v_student.id||':'||v_student.paid||':'||v_student.tuition_total,'finance','orange','₫','Nhắc hoàn tất học phí','Còn '||to_char(v_debt,'FM999G999G999G990')||' ₫ · Đã đóng '||to_char(coalesce(v_student.paid,0),'FM999G999G999G990')||' ₫.','/hoc-vien.html#studentPayment','Xem học phí',null); end if;
    if lower(coalesce(v_student.profile_status,'')) like '%thiếu%' or lower(coalesce(v_student.profile_status,'')) like '%thieu%' then perform public.app_notify_student_v2(v_student.id,'profile:'||v_student.id||':'||md5(coalesce(v_student.profile_status,'')),'profile','red','!','Hồ sơ cần bổ sung',coalesce(v_student.profile_status,'Hồ sơ đang thiếu giấy tờ.'),'/hoc-vien.html#studentProfile','Xem hồ sơ',null); end if;

    select count(*),count(*) filter(where status='present') into v_total,v_present from public.app_attendance_records where student_id=v_student.id;
    v_rate:=case when v_total=0 then 100 else round(100.0*v_present/v_total) end;
    if v_total>=3 and v_rate<80 then perform public.app_notify_student_v2(v_student.id,'attendance-rate:'||v_student.id||':'||v_total||':'||v_present,'attendance',case when v_rate<60 then 'red' else 'orange' end,'!','Tỷ lệ chuyên cần cần cải thiện','Có mặt '||v_present||'/'||v_total||' buổi · Tỷ lệ '||v_rate||'%.','/hoc-vien.html#studentAttendance','Xem điểm danh',null); end if;

    for v_target in select * from public.app_training_hour_targets where license_class=v_student.license_class and required_minutes>0 loop
      select coalesce(sum(actual_minutes),0) into v_actual from public.app_attendance_records where student_id=v_student.id and status='present' and session_type=v_target.session_type;
      v_remaining:=greatest(0,v_target.required_minutes-v_actual);
      v_key:='hours:'||v_student.id||':'||v_target.session_type||':'||v_target.required_minutes||':'||v_actual;
      delete from public.app_notifications notice using public.app_student_accounts account
      where notice.recipient_kind='student' and notice.recipient_id=account.id and account.student_id=v_student.id::text
        and notice.notification_key like 'hours:'||v_student.id||':'||v_target.session_type||':%'
        and (v_remaining=0 or notice.notification_key<>v_key);
      if v_remaining>0 then perform public.app_notify_student_v2(v_student.id,v_key,'training','orange','◷','Còn thiếu giờ '||public.app_schedule_label(v_target.session_type),'Đã ghi nhận '||round(v_actual/60.0,1)||' giờ · Còn '||round(v_remaining/60.0,1)||' giờ theo kế hoạch.','/hoc-vien.html#studentAttendance','Xem giờ thực học',null); end if;
    end loop;
  end loop;
  delete from public.app_notifications where created_at<now()-interval '180 days';
  return (select count(*) from public.app_notifications)-v_before;
end;
$$;

create or replace function public.app_attendance_notification()
returns trigger language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_row public.app_attendance_records;v_student_name text;v_status text;v_body text;v_target integer;v_actual integer;v_remaining integer;
begin
  v_row:=case when tg_op='DELETE' then old else new end;select name into v_student_name from public.students where id=v_row.student_id;
  if tg_op='DELETE' then perform public.app_notify_student_v2(v_row.student_id,'attendance-deleted:'||v_row.id||':'||extract(epoch from now())::bigint,'attendance','violet','↻','Điểm danh đã được điều chỉnh',public.app_schedule_label(v_row.session_type)||' ngày '||to_char(v_row.session_date,'DD/MM/YYYY')||' đã được Admin điều chỉnh.','/hoc-vien.html#studentAttendance','Xem lịch sử',null);return old;end if;
  v_status:=case new.status when 'present' then 'Có mặt' when 'excused' then 'Vắng có phép' else 'Vắng' end;
  v_body:=public.app_schedule_label(new.session_type)||' ngày '||to_char(new.session_date,'DD/MM/YYYY')||' · '||v_status||case when new.status='present' then ' · '||round(new.actual_minutes/60.0,1)||' giờ' else '' end;
  select required_minutes into v_target from public.app_training_hour_targets target join public.students student on student.id=new.student_id and student.license_class=target.license_class where target.session_type=new.session_type;
  if coalesce(v_target,0)>0 then select coalesce(sum(actual_minutes),0) into v_actual from public.app_attendance_records where student_id=new.student_id and status='present' and session_type=new.session_type;v_remaining:=greatest(0,v_target-v_actual);v_body:=v_body||' · Còn '||round(v_remaining/60.0,1)||' giờ theo kế hoạch';end if;
  perform public.app_notify_student_v2(new.student_id,'attendance:'||new.id||':'||extract(epoch from new.updated_at)::bigint,'attendance',case new.status when 'present' then 'green' when 'excused' then 'orange' else 'red' end,'✓','Kết quả điểm danh: '||v_status,v_body,'/hoc-vien.html#studentAttendance','Xem điểm danh',null);
  if new.status<>'present' then perform public.app_notify_managers_v2(new.student_id,'manager-attendance:'||new.id||':'||extract(epoch from new.updated_at)::bigint,'attendance',case when new.status='absent' then 'red' else 'orange' end,'!',coalesce(v_student_name,'Học viên')||' · '||v_status,v_body,'/#earlyWarningDashboard','Xem cảnh báo',null);end if;
  return new;
end;
$$;

drop trigger if exists app_attendance_notification_trigger on public.app_attendance_records;
create trigger app_attendance_notification_trigger after insert or update or delete on public.app_attendance_records for each row execute function public.app_attendance_notification();

create or replace function public.app_exam_attempt_notification()
returns trigger language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_name text;v_body text;
begin
  select name into v_name from public.students where id=new.student_id;
  v_body:='Hạng '||new.license_class||' · '||new.score||'/'||new.total||' câu · '||case when new.passed then 'Đạt' else 'Chưa đạt' end||case when new.critical_correct then '' else ' · Sai câu điểm liệt' end;
  perform public.app_notify_student_v2(new.student_id,'exam:'||new.id,'theory',case when new.passed then 'green' else 'red' end,case when new.passed then '★' else '!' end,'Kết quả thi thử: '||case when new.passed then 'Đạt' else 'Chưa đạt' end,v_body,'/600-cau-hoi.html','Xem kết quả',new.submitted_at);
  perform public.app_notify_managers_v2(new.student_id,'manager-exam:'||new.id,'theory',case when new.passed then 'green' else 'orange' end,case when new.passed then '★' else '⌁' end,coalesce(v_name,'Học viên')||' vừa thi thử '||case when new.passed then 'đạt' else 'chưa đạt' end,v_body,'/#theoryDashboard','Xem tiến độ',new.submitted_at);
  return new;
end;
$$;

drop trigger if exists app_exam_attempt_notification_trigger on public.app_student_exam_attempts;
create trigger app_exam_attempt_notification_trigger after insert on public.app_student_exam_attempts for each row execute function public.app_exam_attempt_notification();

create or replace function public.app_student_status_change_notification()
returns trigger language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_debt numeric;
begin
  if new.paid is distinct from old.paid or new.tuition_total is distinct from old.tuition_total then v_debt:=greatest(0,coalesce(new.tuition_total,0)-coalesce(new.paid,0));perform public.app_notify_student_v2(new.id,'tuition-changed:'||new.id||':'||new.paid||':'||new.tuition_total,'finance',case when v_debt=0 then 'green' else 'blue' end,'₫',case when v_debt=0 then 'Đã hoàn tất học phí' else 'Học phí đã được cập nhật' end,'Đã đóng '||to_char(coalesce(new.paid,0),'FM999G999G999G990')||' ₫ · Còn '||to_char(v_debt,'FM999G999G999G990')||' ₫.','/hoc-vien.html#studentPayment','Xem học phí',null);end if;
  if new.profile_status is distinct from old.profile_status then perform public.app_notify_student_v2(new.id,'profile-changed:'||new.id||':'||md5(coalesce(new.profile_status,'')),'profile',case when lower(coalesce(new.profile_status,'')) like '%thiếu%' or lower(coalesce(new.profile_status,'')) like '%thieu%' then 'red' else 'green' end,'▤','Trạng thái hồ sơ đã cập nhật',coalesce(new.profile_status,'Chưa cập nhật'),'/hoc-vien.html#studentProfile','Xem hồ sơ',null);end if;
  return new;
end;
$$;

drop trigger if exists app_student_status_change_notification_trigger on public.students;
create trigger app_student_status_change_notification_trigger after update of paid,tuition_total,profile_status on public.students for each row execute function public.app_student_status_change_notification();

create or replace function public.app_generate_all_notifications()
returns integer language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_schedule integer;v_status integer;
begin v_schedule:=public.app_generate_schedule_reminders();v_status:=public.app_generate_student_status_notifications();return coalesce(v_schedule,0)+coalesce(v_status,0);end;
$$;

create or replace function public.app_list_notifications(p_token text)
returns jsonb language plpgsql security definer set search_path=public,extensions,pg_temp as $$
declare v_me jsonb;v_kind text;
begin
  begin v_me:=public.app_me(p_token);v_kind:='manager';exception when others then v_me:=public.app_student_me(p_token);v_kind:='student';end;
  perform public.app_generate_all_notifications();
  return coalesce((select jsonb_agg(jsonb_build_object('id',notice.id,'key',notice.notification_key,'category',notice.category,'tone',notice.tone,'icon',notice.icon,'title',notice.title,'body',notice.body,'href',notice.href,'action',notice.action_label,'event_at',notice.event_at,'read_at',notice.read_at,'created_at',notice.created_at) order by notice.created_at desc) from (select * from public.app_notifications where recipient_kind=v_kind and recipient_id::text=v_me->>'id' order by created_at desc limit 100) notice),'[]'::jsonb);
end;
$$;

revoke all on function public.app_notify_student_v2(uuid,text,text,text,text,text,text,text,text,timestamptz) from public;
revoke all on function public.app_notify_managers_v2(uuid,text,text,text,text,text,text,text,text,timestamptz) from public;
revoke all on function public.app_notify_student(uuid,text,text,text,text,text,text,text,timestamptz) from public;
revoke all on function public.app_notify_managers(uuid,text,text,text,text,text,text,text,timestamptz) from public;
revoke all on function public.app_list_training_hour_targets(text) from public;
revoke all on function public.app_save_training_hour_targets(text,text,jsonb) from public;
revoke all on function public.app_generate_student_status_notifications() from public;
revoke all on function public.app_generate_all_notifications() from public;
revoke all on function public.app_attendance_notification() from public;
revoke all on function public.app_exam_attempt_notification() from public;
revoke all on function public.app_student_status_change_notification() from public;
revoke all on function public.app_list_notifications(text) from public;
grant execute on function public.app_list_training_hour_targets(text) to anon,authenticated;
grant execute on function public.app_save_training_hour_targets(text,text,jsonb) to anon,authenticated;
grant execute on function public.app_list_notifications(text) to anon,authenticated;

select public.app_generate_all_notifications();
select pg_notify('pgrst','reload schema');
commit;

do $$
begin
  begin execute 'create extension if not exists pg_cron';exception when others then raise notice 'Không thể bật pg_cron: %',sqlerrm;end;
  if to_regnamespace('cron') is not null then
    if exists(select 1 from cron.job where jobname='hv-auto-notification-center') then perform cron.unschedule((select jobid from cron.job where jobname='hv-auto-notification-center' limit 1));end if;
    perform cron.schedule('hv-auto-notification-center','*/15 * * * *','select public.app_generate_all_notifications();');
  end if;
exception when others then raise notice 'Không thể tạo Cron; thông báo vẫn được tạo khi mở ứng dụng: %',sqlerrm;
end;
$$;

select to_regclass('public.app_training_hour_targets') as hour_targets,
  to_regprocedure('public.app_generate_all_notifications()') as notification_generator,
  to_regprocedure('public.app_list_training_hour_targets(text)') as target_settings;
