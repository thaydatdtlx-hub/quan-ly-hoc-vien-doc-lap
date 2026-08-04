-- CHỈNH SỬA VÀ XÓA ĐĂNG KÝ BỔ TÚC · THẦY ĐẠT
-- Chạy toàn bộ file này một lần trong Supabase SQL Editor.
-- Chỉ tài khoản Admin hợp lệ mới được gọi hai hàm bên dưới.

create or replace function public.app_admin_edit_driving_refresh_registration(
  p_token text,
  p_registration_id uuid,
  p_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_current public.driving_refresh_registrations%rowtype;
  v_row public.driving_refresh_registrations%rowtype;
  v_name text;
  v_phone text;
  v_phone_normalized text;
  v_service_type text;
  v_training_package text;
  v_license_status text;
  v_transmission text;
  v_goals jsonb;
  v_preferred_date date;
  v_preferred_time text;
  v_duration_hours integer;
  v_vehicle_hourly_rate bigint;
  v_track_hourly_rate bigint;
  v_base_hourly_rate bigint;
  v_weekend_surcharge_per_hour bigint;
  v_estimated_total bigint;
  v_area text;
  v_note text;
  v_status text;
  v_admin_note text;
  v_is_weekend boolean := false;
begin
  v_me := public.app_me(p_token);
  if coalesce(v_me->>'role', '') <> 'admin' then
    raise exception 'Chỉ Admin được chỉnh sửa đăng ký bổ túc.';
  end if;

  select * into v_current
  from public.driving_refresh_registrations
  where id = p_registration_id
  for update;

  if v_current.id is null then
    raise exception 'Không tìm thấy đăng ký cần chỉnh sửa.';
  end if;

  v_name := trim(coalesce(p_data->>'full_name', v_current.full_name));
  v_phone := trim(coalesce(p_data->>'phone', v_current.phone));
  v_phone_normalized := regexp_replace(v_phone, '[^0-9]', '', 'g');
  v_service_type := trim(coalesce(p_data->>'service_type', v_current.service_type));
  v_training_package := trim(coalesce(p_data->>'training_package', v_current.training_package));
  v_license_status := trim(coalesce(p_data->>'license_status', v_current.license_status));
  v_transmission := trim(coalesce(p_data->>'transmission', v_current.transmission));
  v_goals := case when p_data ? 'goals' then coalesce(p_data->'goals', '[]'::jsonb) else v_current.goals end;
  v_preferred_time := left(trim(coalesce(p_data->>'preferred_time', v_current.preferred_time, 'Linh hoạt')), 80);
  v_area := nullif(left(trim(coalesce(p_data->>'area', v_current.area, '')), 160), '');
  v_note := nullif(left(trim(coalesce(p_data->>'note', v_current.note, '')), 800), '');
  v_status := trim(coalesce(p_data->>'status', v_current.status));
  v_admin_note := nullif(left(trim(coalesce(p_data->>'admin_note', v_current.admin_note, '')), 800), '');

  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception 'Họ và tên phải có từ 2 đến 80 ký tự.';
  end if;
  if v_phone_normalized !~ '^(0|84)[0-9]{8,10}$' then
    raise exception 'Số điện thoại chưa đúng định dạng.';
  end if;
  if v_service_type not in ('Bổ túc tay lái','Bổ túc sa hình') then
    raise exception 'Nội dung bổ túc chưa hợp lệ.';
  end if;
  if v_transmission not in ('Số tự động','Số sàn') then
    raise exception 'Loại xe chưa hợp lệ.';
  end if;
  if v_license_status not in ('Đã có bằng lái','Đang học lái xe','Lâu chưa lái lại','Chưa có bằng lái') then
    raise exception 'Tình trạng bằng lái chưa hợp lệ.';
  end if;
  if v_status not in ('new','contacted','scheduled','completed','cancelled') then
    raise exception 'Trạng thái xử lý không hợp lệ.';
  end if;

  if v_service_type = 'Bổ túc tay lái' then
    v_training_package := 'Kỹ năng thực tế';
  elsif v_training_package not in ('Luyện tổng hợp','Chọn từng bài') then
    raise exception 'Gói luyện sa hình chưa hợp lệ.';
  end if;

  begin
    v_duration_hours := coalesce(nullif(p_data->>'duration_hours', '')::integer, v_current.duration_hours);
  exception when others then
    raise exception 'Số giờ dự kiến chưa hợp lệ.';
  end;
  if v_duration_hours < 2 or v_duration_hours > 20 then
    raise exception 'Số giờ đăng ký phải từ 2 đến 20 giờ.';
  end if;

  if jsonb_typeof(v_goals) <> 'array' or jsonb_array_length(v_goals) = 0 or jsonb_array_length(v_goals) > 20 then
    raise exception 'Vui lòng nhập ít nhất một kỹ năng hoặc bài sa hình.';
  end if;

  if p_data ? 'preferred_date' then
    if nullif(trim(coalesce(p_data->>'preferred_date', '')), '') is null then
      v_preferred_date := null;
    else
      begin
        v_preferred_date := (p_data->>'preferred_date')::date;
      exception when others then
        raise exception 'Ngày mong muốn chưa hợp lệ.';
      end;
    end if;
  else
    v_preferred_date := v_current.preferred_date;
  end if;

  if v_preferred_date is not null then
    v_is_weekend := extract(isodow from v_preferred_date) in (6, 7);
  elsif v_preferred_time = 'Cuối tuần' then
    v_is_weekend := true;
  end if;

  v_vehicle_hourly_rate := case
    when v_service_type = 'Bổ túc sa hình' and v_transmission = 'Số tự động' then 250000
    when v_service_type = 'Bổ túc sa hình' and v_transmission = 'Số sàn' then 200000
    when v_transmission = 'Số tự động' then 300000
    else 290000
  end;
  v_track_hourly_rate := case when v_service_type = 'Bổ túc sa hình' then 100000 else 0 end;
  v_base_hourly_rate := v_vehicle_hourly_rate + v_track_hourly_rate;
  v_weekend_surcharge_per_hour := case when v_is_weekend then 50000 else 0 end;
  v_estimated_total := (v_base_hourly_rate + v_weekend_surcharge_per_hour) * v_duration_hours;

  update public.driving_refresh_registrations
  set full_name = v_name,
      phone = v_phone,
      phone_normalized = v_phone_normalized,
      service_type = v_service_type,
      training_package = v_training_package,
      license_status = v_license_status,
      transmission = v_transmission,
      goals = v_goals,
      preferred_date = v_preferred_date,
      preferred_time = v_preferred_time,
      duration_hours = v_duration_hours,
      vehicle_hourly_rate = v_vehicle_hourly_rate,
      track_hourly_rate = v_track_hourly_rate,
      base_hourly_rate = v_base_hourly_rate,
      weekend_surcharge_per_hour = v_weekend_surcharge_per_hour,
      estimated_total = v_estimated_total,
      area = v_area,
      note = v_note,
      status = v_status,
      admin_note = v_admin_note,
      contacted_at = case when v_status in ('contacted','scheduled','completed') then coalesce(contacted_at, now()) else contacted_at end,
      scheduled_at = case when v_status in ('scheduled','completed') then coalesce(scheduled_at, now()) else scheduled_at end,
      completed_at = case when v_status = 'completed' then coalesce(completed_at, now()) else completed_at end,
      updated_at = now()
  where id = p_registration_id
  returning * into v_row;

  return jsonb_build_object(
    'id', v_row.id,
    'registration_code', v_row.registration_code,
    'full_name', v_row.full_name,
    'phone', v_row.phone,
    'service_type', v_row.service_type,
    'training_package', v_row.training_package,
    'license_status', v_row.license_status,
    'transmission', v_row.transmission,
    'goals', v_row.goals,
    'preferred_date', v_row.preferred_date,
    'preferred_time', v_row.preferred_time,
    'duration_hours', v_row.duration_hours,
    'vehicle_hourly_rate', v_row.vehicle_hourly_rate,
    'track_hourly_rate', v_row.track_hourly_rate,
    'base_hourly_rate', v_row.base_hourly_rate,
    'weekend_surcharge_per_hour', v_row.weekend_surcharge_per_hour,
    'estimated_total', v_row.estimated_total,
    'area', v_row.area,
    'note', v_row.note,
    'status', v_row.status,
    'admin_note', v_row.admin_note,
    'contacted_at', v_row.contacted_at,
    'scheduled_at', v_row.scheduled_at,
    'completed_at', v_row.completed_at,
    'created_at', v_row.created_at,
    'updated_at', v_row.updated_at
  );
end;
$$;

create or replace function public.app_admin_delete_driving_refresh_registration(
  p_token text,
  p_registration_id uuid
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
    raise exception 'Chỉ Admin được xóa đăng ký bổ túc.';
  end if;

  delete from public.driving_refresh_registrations
  where id = p_registration_id
  returning * into v_row;

  if v_row.id is null then
    raise exception 'Không tìm thấy đăng ký cần xóa.';
  end if;

  return jsonb_build_object(
    'id', v_row.id,
    'registration_code', v_row.registration_code,
    'full_name', v_row.full_name,
    'deleted', true
  );
end;
$$;

revoke all on function public.app_admin_edit_driving_refresh_registration(text,uuid,jsonb) from public;
revoke all on function public.app_admin_delete_driving_refresh_registration(text,uuid) from public;

grant execute on function public.app_admin_edit_driving_refresh_registration(text,uuid,jsonb) to anon, authenticated;
grant execute on function public.app_admin_delete_driving_refresh_registration(text,uuid) to anon, authenticated;

notify pgrst, 'reload schema';

select
  to_regprocedure('public.app_admin_edit_driving_refresh_registration(text,uuid,jsonb)') as edit_registration,
  to_regprocedure('public.app_admin_delete_driving_refresh_registration(text,uuid)') as delete_registration;
