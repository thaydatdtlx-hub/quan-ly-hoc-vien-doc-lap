-- ĐĂNG KÝ HỌC LÁI XE MỚI · THẦY ĐẠT
-- Chạy toàn bộ file này một lần trong Supabase SQL Editor.

create table if not exists public.new_student_registrations (
  id uuid primary key default gen_random_uuid(),
  registration_code text not null unique,
  full_name text not null,
  phone text not null,
  phone_normalized text not null,
  license_class text not null,
  date_of_birth date,
  area text not null,
  preferred_start_date date,
  preferred_contact_time text,
  consultation_channel text,
  learning_history text,
  note text,
  status text not null default 'new',
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint new_student_license_check check (license_class in ('A1','A','B số tự động','B số sàn','C1')),
  constraint new_student_status_check check (status in ('new','contacted','consulting','enrolled','cancelled'))
);

create index if not exists new_student_status_created_idx
  on public.new_student_registrations(status, created_at desc);
create index if not exists new_student_phone_created_idx
  on public.new_student_registrations(phone_normalized, created_at desc);

alter table public.new_student_registrations enable row level security;
revoke all on public.new_student_registrations from anon, authenticated;

create or replace function public.app_create_new_student_registration(p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid := gen_random_uuid();
  v_code text;
  v_name text := trim(coalesce(p_data->>'full_name',''));
  v_phone text := trim(coalesce(p_data->>'phone',''));
  v_phone_normalized text;
  v_license_class text := trim(coalesce(p_data->>'license_class',''));
  v_area text := trim(coalesce(p_data->>'area',''));
  v_date_of_birth date;
  v_preferred_start_date date;
begin
  if trim(coalesce(p_data->>'website','')) <> '' then
    return jsonb_build_object('registration_code','DK-DA-GHI-NHAN');
  end if;
  if coalesce((p_data->>'consent')::boolean,false) is not true then
    raise exception 'Vui lòng đồng ý để Thầy Đạt liên hệ tư vấn.';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'Họ và tên phải có từ 2 đến 80 ký tự.';
  end if;
  v_phone_normalized := regexp_replace(v_phone,'[^0-9]','','g');
  if v_phone_normalized !~ '^(0|84)[0-9]{8,10}$' then
    raise exception 'Số điện thoại chưa đúng định dạng.';
  end if;
  if v_license_class not in ('A1','A','B số tự động','B số sàn','C1') then
    raise exception 'Hạng đào tạo chưa hợp lệ.';
  end if;
  if char_length(v_area) < 2 or char_length(v_area) > 160 then
    raise exception 'Vui lòng nhập khu vực đang sinh sống.';
  end if;
  if char_length(coalesce(p_data->>'note','')) > 800 then
    raise exception 'Ghi chú tối đa 800 ký tự.';
  end if;

  if nullif(p_data->>'date_of_birth','') is not null then
    begin
      v_date_of_birth := (p_data->>'date_of_birth')::date;
    exception when others then
      raise exception 'Ngày sinh chưa hợp lệ.';
    end;
  end if;

  if nullif(p_data->>'preferred_start_date','') is not null then
    begin
      v_preferred_start_date := (p_data->>'preferred_start_date')::date;
    exception when others then
      raise exception 'Ngày dự kiến bắt đầu chưa hợp lệ.';
    end;
    if v_preferred_start_date < current_date then
      raise exception 'Ngày dự kiến bắt đầu không được ở trong quá khứ.';
    end if;
  end if;

  if exists (
    select 1 from public.new_student_registrations
    where phone_normalized = v_phone_normalized
      and created_at > now() - interval '10 minutes'
  ) then
    raise exception 'Số điện thoại này vừa gửi đăng ký. Vui lòng chờ ít phút hoặc liên hệ Zalo.';
  end if;

  v_code := 'DK-' || to_char(current_date,'YYMMDD') || '-' || upper(substr(replace(v_id::text,'-',''),1,6));

  insert into public.new_student_registrations(
    id,registration_code,full_name,phone,phone_normalized,license_class,
    date_of_birth,area,preferred_start_date,preferred_contact_time,
    consultation_channel,learning_history,note
  ) values (
    v_id,v_code,v_name,v_phone,v_phone_normalized,v_license_class,
    v_date_of_birth,left(v_area,160),v_preferred_start_date,
    left(trim(coalesce(p_data->>'preferred_contact_time','Linh hoạt')),80),
    left(trim(coalesce(p_data->>'consultation_channel','Zalo')),80),
    left(trim(coalesce(p_data->>'learning_history','Chưa từng học')),120),
    nullif(left(trim(coalesce(p_data->>'note','')),800),'')
  );

  return jsonb_build_object(
    'id',v_id,
    'registration_code',v_code,
    'license_class',v_license_class,
    'status','new'
  );
end;
$$;

create or replace function public.app_admin_list_new_student_registrations(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare v_me jsonb;
begin
  v_me := public.app_me(p_token);
  if coalesce(v_me->>'role','') <> 'admin' then
    raise exception 'Chỉ Admin được xem danh sách đăng ký học lái xe.';
  end if;
  return coalesce((
    select jsonb_agg(to_jsonb(r) order by case r.status when 'new' then 0 else 1 end,r.created_at desc)
    from public.new_student_registrations r
  ),'[]'::jsonb);
end;
$$;

create or replace function public.app_admin_update_new_student_registration(
  p_token text,
  p_registration_id uuid,
  p_status text,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare v_me jsonb; v_row public.new_student_registrations%rowtype;
begin
  v_me := public.app_me(p_token);
  if coalesce(v_me->>'role','') <> 'admin' then
    raise exception 'Chỉ Admin được cập nhật đăng ký học lái xe.';
  end if;
  if p_status not in ('new','contacted','consulting','enrolled','cancelled') then
    raise exception 'Trạng thái không hợp lệ.';
  end if;
  update public.new_student_registrations
  set status=p_status,
      admin_note=nullif(left(trim(coalesce(p_admin_note,'')),800),''),
      updated_at=now()
  where id=p_registration_id
  returning * into v_row;
  if v_row.id is null then raise exception 'Không tìm thấy đăng ký.'; end if;
  return to_jsonb(v_row);
end;
$$;

revoke all on function public.app_create_new_student_registration(jsonb) from public;
revoke all on function public.app_admin_list_new_student_registrations(text) from public;
revoke all on function public.app_admin_update_new_student_registration(text,uuid,text,text) from public;

grant execute on function public.app_create_new_student_registration(jsonb) to anon, authenticated;
grant execute on function public.app_admin_list_new_student_registrations(text) to anon, authenticated;
grant execute on function public.app_admin_update_new_student_registration(text,uuid,text,text) to anon, authenticated;

notify pgrst, 'reload schema';
