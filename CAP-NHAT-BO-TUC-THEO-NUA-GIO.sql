-- CHO PHÉP ĐĂNG KÝ BỔ TÚC THEO NỬA GIỜ
-- Ví dụ hợp lệ: 1; 1.5; 2; 2.5; ...; 20
-- Chạy toàn bộ file này một lần trong Supabase SQL Editor.

alter table public.driving_refresh_registrations
  alter column duration_hours type numeric(4,1)
  using duration_hours::numeric(4,1);

alter table public.driving_refresh_registrations
  alter column duration_hours set default 1.0;

alter table public.driving_refresh_registrations
  drop constraint if exists driving_refresh_duration_check;

alter table public.driving_refresh_registrations
  add constraint driving_refresh_duration_check
  check (
    duration_hours between 1 and 20
    and mod(duration_hours * 2, 1) = 0
  );

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
  v_service_type text := trim(coalesce(p_data->>'service_type', 'Bổ túc tay lái'));
  v_training_package text := trim(coalesce(p_data->>'training_package', 'Kỹ năng thực tế'));
  v_license_status text := trim(coalesce(p_data->>'license_status', ''));
  v_transmission text := trim(coalesce(p_data->>'transmission', ''));
  v_goals jsonb := coalesce(p_data->'goals', '[]'::jsonb);
  v_preferred_date date;
  v_duration_hours numeric(4,1);
  v_vehicle_hourly_rate bigint;
  v_track_hourly_rate bigint := 0;
  v_base_hourly_rate bigint;
  v_weekend_surcharge_per_hour bigint := 0;
  v_estimated_total bigint;
  v_is_weekend boolean := false;
begin
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

  if v_transmission not in ('Số tự động','Số sàn') then
    raise exception 'Vui lòng chọn loại xe muốn luyện.';
  end if;

  if v_service_type not in ('Bổ túc tay lái','Bổ túc sa hình') then
    raise exception 'Nội dung bổ túc chưa hợp lệ.';
  end if;

  if (v_service_type = 'Bổ túc sa hình' and v_training_package not in ('Luyện tổng hợp','Chọn từng bài'))
    or (v_service_type = 'Bổ túc tay lái' and v_training_package <> 'Kỹ năng thực tế') then
    raise exception 'Gói luyện tập chưa hợp lệ.';
  end if;

  begin
    v_duration_hours := replace(p_data->>'duration_hours', ',', '.')::numeric(4,1);
  exception when others then
    raise exception 'Số giờ dự kiến chưa hợp lệ.';
  end;

  if v_duration_hours is null
    or v_duration_hours < 1
    or v_duration_hours > 20
    or mod(v_duration_hours * 2, 1) <> 0 then
    raise exception 'Số giờ đăng ký phải từ 1 đến 20 giờ và theo bước 0,5 giờ.';
  end if;

  if jsonb_typeof(v_goals) <> 'array'
    or jsonb_array_length(v_goals) = 0
    or jsonb_array_length(v_goals) > 20 then
    raise exception 'Vui lòng chọn ít nhất một kỹ năng muốn luyện.';
  end if;

  if char_length(coalesce(p_data->>'area', '')) > 160
    or char_length(coalesce(p_data->>'note', '')) > 800 then
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

    v_is_weekend := extract(isodow from v_preferred_date) in (6, 7);
  elsif trim(coalesce(p_data->>'preferred_time', '')) = 'Cuối tuần' then
    v_is_weekend := true;
  end if;

  v_vehicle_hourly_rate := case
    when v_service_type = 'Bổ túc sa hình' and v_transmission = 'Số tự động' then 250000
    when v_service_type = 'Bổ túc sa hình' and v_transmission = 'Số sàn' then 200000
    when v_transmission = 'Số tự động' then 300000
    else 290000
  end;

  v_track_hourly_rate := case
    when v_service_type = 'Bổ túc sa hình' then 100000
    else 0
  end;

  v_base_hourly_rate := v_vehicle_hourly_rate + v_track_hourly_rate;
  v_weekend_surcharge_per_hour := case when v_is_weekend then 50000 else 0 end;
  v_estimated_total := ((v_base_hourly_rate + v_weekend_surcharge_per_hour) * v_duration_hours)::bigint;

  if exists (
    select 1
    from public.driving_refresh_registrations
    where phone_normalized = v_phone_normalized
      and created_at > now() - interval '10 minutes'
  ) then
    raise exception 'Số điện thoại này vừa gửi đăng ký. Vui lòng chờ ít phút hoặc liên hệ Zalo.';
  end if;

  v_code := case when v_service_type = 'Bổ túc sa hình' then 'SH-' else 'BT-' end
    || to_char(current_date, 'YYMMDD')
    || '-'
    || upper(substr(replace(v_id::text, '-', ''), 1, 6));

  insert into public.driving_refresh_registrations(
    id, registration_code, full_name, phone, phone_normalized, service_type, training_package,
    license_status, transmission, goals, preferred_date,
    preferred_time, duration_hours, vehicle_hourly_rate, track_hourly_rate, base_hourly_rate,
    weekend_surcharge_per_hour, estimated_total, area, note
  ) values (
    v_id, v_code, v_name, v_phone, v_phone_normalized, v_service_type, v_training_package,
    v_license_status, v_transmission, v_goals, v_preferred_date,
    left(trim(coalesce(p_data->>'preferred_time', 'Linh hoạt')), 80),
    v_duration_hours, v_vehicle_hourly_rate, v_track_hourly_rate, v_base_hourly_rate,
    v_weekend_surcharge_per_hour, v_estimated_total,
    nullif(left(trim(coalesce(p_data->>'area', '')), 160), ''),
    nullif(left(trim(coalesce(p_data->>'note', '')), 800), '')
  );

  return jsonb_build_object(
    'id', v_id,
    'registration_code', v_code,
    'status', 'new',
    'service_type', v_service_type,
    'training_package', v_training_package,
    'duration_hours', v_duration_hours,
    'vehicle_hourly_rate', v_vehicle_hourly_rate,
    'track_hourly_rate', v_track_hourly_rate,
    'base_hourly_rate', v_base_hourly_rate,
    'weekend_surcharge_per_hour', v_weekend_surcharge_per_hour,
    'estimated_total', v_estimated_total
  );
end;
$$;

revoke all on function public.app_create_driving_refresh_registration(jsonb) from public;
grant execute on function public.app_create_driving_refresh_registration(jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
