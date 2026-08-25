-- LỊCH SỬ THU HỌC PHÍ VÀ PHIẾU THU
-- Chạy toàn bộ file này trong Supabase SQL Editor đúng 1 lần.
-- Dữ liệu "Đã thu" hiện có được giữ lại dưới dạng số dư ban đầu.

begin;

create table if not exists public.app_student_payments (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  receipt_no text not null unique,
  amount numeric(14,0) not null check (amount > 0),
  payment_date date not null default current_date,
  payment_method text not null default 'bank_transfer'
    check (payment_method in ('cash', 'bank_transfer', 'card', 'other')),
  note text not null default '',
  created_by uuid references public.app_users(id) on delete set null,
  created_at timestamptz not null default now(),
  voided_at timestamptz,
  voided_by uuid references public.app_users(id) on delete set null,
  void_reason text not null default ''
);

create index if not exists app_student_payments_student_date_idx
  on public.app_student_payments(student_id, payment_date desc, created_at desc);
create index if not exists app_student_payments_created_idx
  on public.app_student_payments(created_at desc);

alter table public.app_student_payments enable row level security;
revoke all on public.app_student_payments from anon, authenticated;

-- Giữ nguyên tổng tiền đã thu trước khi bật sổ giao dịch.
insert into public.app_student_payments(
  student_id, receipt_no, amount, payment_date, payment_method, note, created_at
)
select
  student.id,
  'SD-' || upper(substr(replace(student.id::text, '-', ''), 1, 12)),
  student.paid,
  coalesce(student.updated_at::date, student.created_at::date, current_date),
  'other',
  'Số dư đã thu trước khi kích hoạt lịch sử học phí',
  coalesce(student.updated_at, student.created_at, now())
from public.students student
where student.paid > 0
  and not exists (
    select 1 from public.app_student_payments payment
    where payment.student_id = student.id
  )
on conflict (receipt_no) do nothing;

create or replace function public.app_recalculate_student_paid(p_student_id uuid)
returns numeric
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_paid numeric(14,0);
begin
  select coalesce(sum(payment.amount), 0)
  into v_paid
  from public.app_student_payments payment
  where payment.student_id = p_student_id
    and payment.voided_at is null;

  update public.students
  set paid = least(tuition_total, v_paid), updated_at = now()
  where id = p_student_id;

  return v_paid;
end;
$$;

create or replace function public.app_list_student_payments(
  p_token text,
  p_student_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  perform public.app_require_admin(p_token);

  return coalesce((
    select jsonb_agg(to_jsonb(item) order by item.payment_date desc, item.created_at desc)
    from (
      select
        payment.id,
        payment.student_id,
        student.student_code,
        student.name as student_name,
        student.phone as student_phone,
        student.date_of_birth,
        student.cccd,
        student.address,
        student.license_class,
        student.course,
        student.tuition_total,
        student.paid,
        payment.receipt_no,
        payment.amount,
        payment.payment_date,
        payment.payment_method,
        payment.note,
        payment.created_at,
        creator.username as created_by_username,
        payment.voided_at,
        voider.username as voided_by_username,
        payment.void_reason
      from public.app_student_payments payment
      join public.students student on student.id = payment.student_id
      left join public.app_users creator on creator.id = payment.created_by
      left join public.app_users voider on voider.id = payment.voided_by
      where nullif(btrim(coalesce(p_student_id, '')), '') is null
         or payment.student_id::text = btrim(p_student_id)
      order by payment.payment_date desc, payment.created_at desc
      limit 1000
    ) item
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_student_list_payments(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
begin
  v_me := public.app_student_me(p_token);
  if coalesce(v_me->>'role', '') <> 'student' then
    raise exception 'Tài khoản không có quyền xem lịch sử học phí.';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(item) order by item.payment_date desc, item.created_at desc)
    from (
      select
        payment.id,
        payment.student_id,
        student.student_code,
        student.name as student_name,
        student.phone as student_phone,
        student.date_of_birth,
        student.cccd,
        student.address,
        student.license_class,
        student.course,
        student.tuition_total,
        student.paid,
        payment.receipt_no,
        payment.amount,
        payment.payment_date,
        payment.payment_method,
        payment.note,
        payment.created_at,
        creator.username as created_by_username
      from public.app_student_payments payment
      join public.students student on student.id = payment.student_id
      left join public.app_users creator on creator.id = payment.created_by
      where payment.student_id::text = v_me->>'student_id'
        and payment.voided_at is null
      order by payment.payment_date desc, payment.created_at desc
    ) item
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_save_student_payment(
  p_token text,
  p_student_id text,
  p_amount numeric,
  p_payment_date date,
  p_payment_method text,
  p_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_student public.students;
  v_payment_id uuid;
  v_receipt_no text;
  v_amount numeric(14,0);
  v_paid numeric(14,0);
begin
  v_me := public.app_require_admin(p_token);
  v_amount := coalesce(p_amount, 0);

  if v_amount <= 0 then
    raise exception 'Số tiền thu phải lớn hơn 0.';
  end if;
  if coalesce(p_payment_method, '') not in ('cash', 'bank_transfer', 'card', 'other') then
    raise exception 'Phương thức thanh toán không hợp lệ.';
  end if;

  select * into v_student
  from public.students
  where id::text = btrim(coalesce(p_student_id, ''))
    and deleted_at is null
  for update;

  if v_student.id is null then
    raise exception 'Không tìm thấy hồ sơ học viên.';
  end if;
  if v_student.paid + v_amount > v_student.tuition_total then
    raise exception 'Số tiền thu vượt quá học phí còn nợ %.',
      to_char(greatest(0, v_student.tuition_total - v_student.paid), 'FM999G999G999G990');
  end if;

  v_payment_id := extensions.gen_random_uuid();
  v_receipt_no := 'PT-' || to_char(coalesce(p_payment_date, current_date), 'YYYYMMDD')
    || '-' || upper(substr(replace(v_payment_id::text, '-', ''), 1, 8));

  insert into public.app_student_payments(
    id, student_id, receipt_no, amount, payment_date,
    payment_method, note, created_by
  ) values (
    v_payment_id, v_student.id, v_receipt_no, v_amount,
    coalesce(p_payment_date, current_date), p_payment_method,
    left(btrim(coalesce(p_note, '')), 500), (v_me->>'id')::uuid
  );

  v_paid := public.app_recalculate_student_paid(v_student.id);

  insert into public.app_audit_logs(
    actor_id, actor_username, actor_role, action,
    entity_type, entity_id, entity_label, details
  ) values (
    (v_me->>'id')::uuid, v_me->>'username', v_me->>'role', 'payment_created',
    'student_payment', v_payment_id::text, v_receipt_no,
    jsonb_build_object('student_id', v_student.id, 'student_name', v_student.name,
      'amount', v_amount, 'payment_method', p_payment_method)
  );

  return jsonb_build_object(
    'id', v_payment_id,
    'receipt_no', v_receipt_no,
    'paid', v_paid,
    'debt', greatest(0, v_student.tuition_total - v_paid)
  );
end;
$$;

create or replace function public.app_void_student_payment(
  p_token text,
  p_payment_id text,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_payment public.app_student_payments;
begin
  v_me := public.app_require_admin(p_token);
  if length(btrim(coalesce(p_reason, ''))) < 3 then
    raise exception 'Vui lòng nhập lý do hủy phiếu thu.';
  end if;

  select * into v_payment
  from public.app_student_payments
  where id::text = btrim(coalesce(p_payment_id, ''))
  for update;

  if v_payment.id is null then raise exception 'Không tìm thấy phiếu thu.'; end if;
  if v_payment.voided_at is not null then raise exception 'Phiếu thu đã được hủy trước đó.'; end if;

  update public.app_student_payments
  set voided_at = now(), voided_by = (v_me->>'id')::uuid,
      void_reason = left(btrim(p_reason), 500)
  where id = v_payment.id;

  perform public.app_recalculate_student_paid(v_payment.student_id);

  insert into public.app_audit_logs(
    actor_id, actor_username, actor_role, action,
    entity_type, entity_id, entity_label, details
  ) values (
    (v_me->>'id')::uuid, v_me->>'username', v_me->>'role', 'payment_voided',
    'student_payment', v_payment.id::text, v_payment.receipt_no,
    jsonb_build_object('student_id', v_payment.student_id, 'amount', v_payment.amount,
      'reason', left(btrim(p_reason), 500))
  );

  return true;
end;
$$;

-- Dùng sau khi nhập Excel để tạo giao dịch số dư tương ứng mà không làm tăng "Đã thu" lần hai.
create or replace function public.app_sync_student_payment_balance(
  p_token text,
  p_student_id text,
  p_source text default 'Nhập dữ liệu'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_student public.students;
  v_history numeric(14,0);
  v_difference numeric(14,0);
  v_payment_id uuid;
  v_receipt_no text;
begin
  v_me := public.app_require_admin(p_token);
  select * into v_student from public.students
  where id::text = btrim(coalesce(p_student_id, '')) for update;
  if v_student.id is null then raise exception 'Không tìm thấy hồ sơ học viên.'; end if;

  select coalesce(sum(amount), 0) into v_history
  from public.app_student_payments
  where student_id = v_student.id and voided_at is null;
  v_difference := v_student.paid - v_history;

  if v_difference > 0 then
    v_payment_id := extensions.gen_random_uuid();
    v_receipt_no := 'NK-' || to_char(current_date, 'YYYYMMDD') || '-'
      || upper(substr(replace(v_payment_id::text, '-', ''), 1, 8));
    insert into public.app_student_payments(
      id, student_id, receipt_no, amount, payment_date,
      payment_method, note, created_by
    ) values (
      v_payment_id, v_student.id, v_receipt_no, v_difference, current_date,
      'other', left(coalesce(nullif(btrim(p_source), ''), 'Nhập dữ liệu'), 500),
      (v_me->>'id')::uuid
    );
  elsif v_difference < 0 then
    update public.students set paid = least(tuition_total, v_history), updated_at = now()
    where id = v_student.id;
  end if;

  return jsonb_build_object(
    'created', v_difference > 0,
    'difference', greatest(v_difference, 0),
    'paid', greatest(v_student.paid, v_history)
  );
end;
$$;

revoke all on function public.app_recalculate_student_paid(uuid) from public;
revoke all on function public.app_list_student_payments(text,text) from public;
revoke all on function public.app_student_list_payments(text) from public;
revoke all on function public.app_save_student_payment(text,text,numeric,date,text,text) from public;
revoke all on function public.app_void_student_payment(text,text,text) from public;
revoke all on function public.app_sync_student_payment_balance(text,text,text) from public;

grant execute on function public.app_list_student_payments(text,text) to anon, authenticated;
grant execute on function public.app_student_list_payments(text) to anon, authenticated;
grant execute on function public.app_save_student_payment(text,text,numeric,date,text,text) to anon, authenticated;
grant execute on function public.app_void_student_payment(text,text,text) to anon, authenticated;
grant execute on function public.app_sync_student_payment_balance(text,text,text) to anon, authenticated;

commit;

select
  to_regclass('public.app_student_payments') as payment_table,
  to_regprocedure('public.app_list_student_payments(text,text)') as admin_payment_history,
  to_regprocedure('public.app_student_list_payments(text)') as student_payment_history,
  to_regprocedure('public.app_save_student_payment(text,text,numeric,date,text,text)') as save_payment,
  to_regprocedure('public.app_void_student_payment(text,text,text)') as void_payment;
