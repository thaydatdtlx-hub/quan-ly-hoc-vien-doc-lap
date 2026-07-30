-- ============================================================
-- BỔ SUNG CA HỌC "THỰC HÀNH DAT"
-- Chạy toàn bộ file này 1 lần trong Supabase SQL Editor.
-- File an toàn để chạy lại khi cần.
-- ============================================================

begin;

do $$
declare
  v_constraint record;
begin
  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.training_slots'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%session_type%'
  loop
    execute format('alter table public.training_slots drop constraint %I', v_constraint.conname);
  end loop;

  alter table public.training_slots
    add constraint training_slots_session_type_check
    check (session_type in ('familiar', 'dat_practice', 'practice'));

  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.student_training_sessions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%session_type%'
  loop
    execute format('alter table public.student_training_sessions drop constraint %I', v_constraint.conname);
  end loop;

  alter table public.student_training_sessions
    add constraint student_training_sessions_session_type_check
    check (session_type in ('familiar', 'dat_practice', 'practice'));

  for v_constraint in
    select conname
    from pg_constraint
    where conrelid = 'public.student_training_requests'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%request_type%'
  loop
    execute format('alter table public.student_training_requests drop constraint %I', v_constraint.conname);
  end loop;

  alter table public.student_training_requests
    add constraint student_training_requests_request_type_check
    check (request_type in ('familiar', 'dat_practice', 'practice'));
end;
$$;

do $$
declare
  v_name text;
  v_function regprocedure;
  v_definition text;
  v_updated text;
begin
  foreach v_name in array array[
    'public.app_admin_save_training_slot(text,text,text,text,integer,text,text,text,integer,text,text)',
    'public.app_admin_save_training_session(text,text,text,text,text,text,text)',
    'public.app_student_create_training_request(text,text,text,text)'
  ]
  loop
    v_function := to_regprocedure(v_name);
    if v_function is null then
      continue;
    end if;

    v_definition := pg_get_functiondef(v_function);
    v_updated := replace(
      v_definition,
      '(''familiar'', ''practice'')',
      '(''familiar'', ''dat_practice'', ''practice'')'
    );

    if v_updated = v_definition then
      if position('dat_practice' in v_definition) = 0 then
        raise exception 'Không thể cập nhật hàm %. Vui lòng kiểm tra phiên bản SQL hiện tại.', v_name;
      end if;
    else
      execute v_updated;
    end if;
  end loop;
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

select pg_notify('pgrst', 'reload schema');

commit;

select
  to_regclass('public.training_slots') as training_slots,
  to_regprocedure('public.app_admin_save_training_slot(text,text,text,text,integer,text,text,text,integer,text,text)') as save_slot,
  public.app_schedule_label('dat_practice') as dat_label;
