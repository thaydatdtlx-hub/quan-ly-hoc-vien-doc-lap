-- ĐĂNG KÝ BỔ TÚC TAY LÁI · THẦY ĐẠT
-- Chạy toàn bộ file này một lần trong Supabase SQL Editor.

create table if not exists public.driving_refresh_registrations (
  id uuid primary key default gen_random_uuid(),
  registration_code text not null unique,
  full_name text not null,
  phone text not null,
  phone_normalized text not null,
  license_status text not null,
  transmission text not null,
  goals jsonb not null default '[]'::jsonb,
  preferred_date date,
  preferred_time text,
  area text,
  note text,
  status text not null default 'new',
  admin_note text,
  contacted_at timestamptz,
  scheduled_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint driving_refresh_status_check check (status in ('new','contacted','scheduled','completed','cancelled')),
  constraint driving_refresh_goals_array_check check (jsonb_typeof(goals) = 'array')
);

create index if not exists driving_refresh_status_created_idx
  on public.driving_refresh_registrations(status, created_at desc);
create index if not exists driving_refresh_phone_created_idx
  on public.driving_refresh_registrations(phone_normalized, created_at desc);

alter table public.driving_refresh_registrations enable row level security;
revoke all on public.driving_refresh_registrations from anon, authenticated;

create or replace function public.app_create_driving_refresh_registration(p_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_id uuid := gen_random_uuid();
  v_code text;
  v_name text := trim(coalesce(p_data->>'full_name', ''));
  v_phone text := trim(coalesce(p_data->>'phone', ''));
  v_phone_normalized text;
  v_license_status text := trim(coalesce(p_data->>'license_status', ''));
  v_transmission text := trim(coalesce(p_data->>'transmission', ''));
  v_goals jsonb := coalesce(p_data->'goals', '[]'::jsonb);
  v_preferred_date date;
begin
  -- Honeypot: phản hồi như thành công nhưng không ghi dữ liệu spam.
  if trim(coalesce(p_data->>'website', '')) <> '' then
    return jsonb_build_object('registration_code', 'BT-DA-GHI-NHAN');
  end if;

  if coalesce((p_data->>'consent')::boolean, false) is not true then
    raise exception 'Vui lòng đồng ý để Thầy Đạt liên hệ tư vấn.';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'Họ và tên phải có từ 2 đến 80 ký tự.';
  end if;

  v_phone_normalized := regexp_replace(v_phone, '[^0-9]', '', 'g');
  if v_phone_normalized !~ '^(0|84)[0-9]{8,10}$' then
    raise exception 'Số điện thoại chưa đúng định dạng.';
  end if;
  if v_license_status not in ('Đã có bằng lái','Đang học lái xe','Lâu chưa lái lại','Chưa có bằng lái') then
    raise exception 'Vui lòng chọn tình trạng bằng lái.';
  end if;
  if v_transmission not in ('Số tự động','Số sàn','Cần tư vấn') then
    raise exception 'Vui lòng chọn loại xe muốn luyện.';
  end if;
  if jsonb_typeof(v_goals) <> 'array' or jsonb_array_length(v_goals) = 0 or jsonb_array_length(v_goals) > 10 then
    raise exception 'Vui lòng chọn ít nhất một kỹ năng muốn luyện.';
  end if;
  if char_length(coalesce(p_data->>'area', '')) > 160 or char_length(coalesce(p_data->>'note', '')) > 800 then
    raise exception 'Nội dung đăng ký vượt quá độ dài cho phép.';
  end if;

  if nullif(p_data->>'preferred_date', '') is not null then
    begin
      v_preferred_date := (p_data->>'preferred_date')::date;
    exception when others then
      raise exception 'Ngày mong muốn chưa hợp lệ.';
    end;
    if v_preferred_date < current_date then
      raise exception 'Ngày mong muốn không được ở trong quá khứ.';
    end if;
  end if;

  if exists (
    select 1 from public.driving_refresh_registrations
    where phone_normalized = v_phone_normalized
      and created_at > now() - interval '10 minutes'
  ) then
    raise exception 'Số điện thoại này vừa gửi đăng ký. Vui lòng chờ ít phút hoặc liên hệ Zalo.';
  end if;

  v_code := 'BT-' || to_char(current_date, 'YYMMDD') || '-' || upper(substr(replace(v_id::text, '-', ''), 1, 6));

  insert into public.driving_refresh_registrations(
    id, registration_code, full_name, phone, phone_normalized,
    license_status, transmission, goals, preferred_date,
    preferred_time, area, note
  ) values (
    v_id, v_code, v_name, v_phone, v_phone_normalized,
    v_license_status, v_transmission, v_goals, v_preferred_date,
    left(trim(coalesce(p_data->>'preferred_time', 'Linh hoạt')), 80),
    nullif(left(trim(coalesce(p_data->>'area', '')), 160), ''),
    nullif(left(trim(coalesce(p_data->>'note', '')), 800), '')
  );

  return jsonb_build_object('id', v_id, 'registration_code', v_code, 'status', 'new');
end;
$$;

create or replace function public.app_admin_list_driving_refresh_registrations(p_token text)
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
    raise exception 'Chỉ Admin được xem danh sách đăng ký bổ túc tay lái.';
  end if;

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', r.id,
        'registration_code', r.registration_code,
        'full_name', r.full_name,
        'phone', r.phone,
        'license_status', r.license_status,
        'transmission', r.transmission,
        'goals', r.goals,
        'preferred_date', r.preferred_date,
        'preferred_time', r.preferred_time,
        'area', r.area,
        'note', r.note,
        'status', r.status,
        'admin_note', r.admin_note,
        'contacted_at', r.contacted_at,
        'scheduled_at', r.scheduled_at,
        'completed_at', r.completed_at,
        'created_at', r.created_at,
        'updated_at', r.updated_at
      ) order by case r.status when 'new' then 0 when 'contacted' then 1 when 'scheduled' then 2 else 3 end, r.created_at desc
    )
    from public.driving_refresh_registrations r
  ), '[]'::jsonb);
end;
$$;

create or replace function public.app_admin_update_driving_refresh_registration(
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
declare
  v_me jsonb;
  v_row public.driving_refresh_registrations%rowtype;
begin
  v_me := public.app_me(p_token);
  if coalesce(v_me->>'role', '') <> 'admin' then
    raise exception 'Chỉ Admin được cập nhật đăng ký bổ túc tay lái.';
  end if;
  if p_status not in ('new','contacted','scheduled','completed','cancelled') then
    raise exception 'Trạng thái xử lý không hợp lệ.';
  end if;
  if char_length(coalesce(p_admin_note, '')) > 800 then
    raise exception 'Ghi chú Admin tối đa 800 ký tự.';
  end if;

  update public.driving_refresh_registrations
  set status = p_status,
      admin_note = nullif(trim(coalesce(p_admin_note, '')), ''),
      contacted_at = case when p_status in ('contacted','scheduled','completed') then coalesce(contacted_at, now()) else contacted_at end,
      scheduled_at = case when p_status in ('scheduled','completed') then coalesce(scheduled_at, now()) else scheduled_at end,
      completed_at = case when p_status = 'completed' then coalesce(completed_at, now()) else completed_at end,
      updated_at = now()
  where id = p_registration_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Không tìm thấy đăng ký cần cập nhật.';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'status', v_row.status,
    'admin_note', v_row.admin_note,
    'contacted_at', v_row.contacted_at,
    'scheduled_at', v_row.scheduled_at,
    'completed_at', v_row.completed_at,
    'updated_at', v_row.updated_at
  );
end;
$$;

revoke all on function public.app_create_driving_refresh_registration(jsonb) from public;
revoke all on function public.app_admin_list_driving_refresh_registrations(text) from public;
revoke all on function public.app_admin_update_driving_refresh_registration(text,uuid,text,text) from public;

grant execute on function public.app_create_driving_refresh_registration(jsonb) to anon, authenticated;
grant execute on function public.app_admin_list_driving_refresh_registrations(text) to anon, authenticated;
grant execute on function public.app_admin_update_driving_refresh_registration(text,uuid,text,text) to anon, authenticated;

notify pgrst, 'reload schema';

