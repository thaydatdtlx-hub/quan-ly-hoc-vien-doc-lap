-- HỌC VIÊN TỰ CẬP NHẬT HỒ SƠ · ADMIN NHẬN THÔNG BÁO CHI TIẾT
-- Chạy toàn bộ file này một lần trong Supabase SQL Editor.

begin;

do $$
begin
  if to_regclass('public.students') is null then
    raise exception 'Chưa có bảng public.students.';
  end if;
  if to_regprocedure('public.app_student_me(text)') is null then
    raise exception 'Chưa có hàm app_student_me(text).';
  end if;
  if to_regprocedure('public.app_student_portal(text)') is null then
    raise exception 'Chưa có hàm app_student_portal(text).';
  end if;
  if to_regprocedure('public.app_require_admin(text)') is null then
    raise exception 'Chưa có hàm app_require_admin(text).';
  end if;
  if to_regprocedure('public.app_notify_managers_v2(uuid,text,text,text,text,text,text,text,text,timestamptz)') is null then
    raise exception 'Cần chạy CAP-NHAT-TRUNG-TAM-THONG-BAO.sql trước.';
  end if;
end;
$$;

create table if not exists public.app_student_profile_changes (
  id uuid primary key default extensions.gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  student_name text not null,
  student_code text,
  actor_username text,
  changed_fields jsonb not null default '{}'::jsonb,
  change_summary text not null,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz not null default now(),
  constraint app_student_profile_changes_object check (jsonb_typeof(changed_fields) = 'object')
);

create index if not exists app_student_profile_changes_student_idx
  on public.app_student_profile_changes(student_id, created_at desc);
create index if not exists app_student_profile_changes_unreviewed_idx
  on public.app_student_profile_changes(reviewed_at, created_at desc);

alter table public.app_student_profile_changes enable row level security;
revoke all on public.app_student_profile_changes from anon, authenticated;

create or replace function public.app_student_update_profile(
  p_token text,
  p_profile jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_student_id uuid;
  v_old public.students%rowtype;
  v_name text;
  v_phone text;
  v_address text;
  v_cccd text;
  v_birth date;
  v_photo text;
  v_changes jsonb := '{}'::jsonb;
  v_labels text[] := array[]::text[];
  v_change_id uuid;
  v_summary text;
  v_result jsonb;
begin
  if p_profile is null or jsonb_typeof(p_profile) <> 'object' then
    raise exception 'Dữ liệu hồ sơ chưa hợp lệ.';
  end if;

  v_me := public.app_student_me(p_token);
  if coalesce(v_me->>'role', '') <> 'student' then
    raise exception 'Chỉ tài khoản học viên được tự cập nhật hồ sơ.';
  end if;

  v_student_id := nullif(v_me->>'student_id', '')::uuid;
  if v_student_id is null then
    raise exception 'Tài khoản chưa được liên kết với hồ sơ học viên.';
  end if;

  select * into v_old
  from public.students
  where id = v_student_id and deleted_at is null
  for update;

  if not found then
    raise exception 'Không tìm thấy hồ sơ học viên.';
  end if;

  v_name := btrim(coalesce(p_profile->>'name', v_old.name, ''));
  v_phone := btrim(coalesce(p_profile->>'phone', v_old.phone, ''));
  v_address := btrim(coalesce(p_profile->>'address', v_old.address, ''));
  v_cccd := regexp_replace(btrim(coalesce(p_profile->>'cccd', v_old.cccd, '')), '[^0-9]', '', 'g');
  v_photo := case
    when p_profile ? 'photo_data' then coalesce(p_profile->>'photo_data', '')
    else coalesce(v_old.photo_data, '')
  end;

  if p_profile ? 'date_of_birth' then
    if btrim(coalesce(p_profile->>'date_of_birth', '')) = '' then
      v_birth := null;
    else
      begin
        v_birth := (p_profile->>'date_of_birth')::date;
      exception when others then
        raise exception 'Ngày sinh chưa đúng định dạng.';
      end;
    end if;
  else
    v_birth := v_old.date_of_birth;
  end if;

  if char_length(v_name) < 2 or char_length(v_name) > 120 then
    raise exception 'Họ và tên phải có từ 2 đến 120 ký tự.';
  end if;
  if v_phone <> '' and regexp_replace(v_phone, '[^0-9]', '', 'g') !~ '^(0|84)[0-9]{8,10}$' then
    raise exception 'Số điện thoại chưa đúng định dạng.';
  end if;
  if v_cccd <> '' and v_cccd !~ '^([0-9]{9}|[0-9]{12})$' then
    raise exception 'CCCD/CMND phải có 9 hoặc 12 chữ số.';
  end if;
  if char_length(v_address) > 400 then
    raise exception 'Địa chỉ không được vượt quá 400 ký tự.';
  end if;
  if v_birth is not null and v_birth > current_date then
    raise exception 'Ngày sinh không được ở trong tương lai.';
  end if;
  if v_photo <> '' then
    if v_photo !~ '^data:image/(jpeg|jpg|png|webp);base64,' then
      raise exception 'Ảnh đại diện chưa đúng định dạng JPG, PNG hoặc WebP.';
    end if;
    if char_length(v_photo) > 900000 then
      raise exception 'Ảnh đại diện quá lớn. Vui lòng chọn ảnh khác.';
    end if;
  end if;

  if v_name is distinct from v_old.name then
    v_changes := v_changes || jsonb_build_object('name', jsonb_build_object(
      'label', 'Họ và tên', 'old', coalesce(v_old.name, ''), 'new', v_name
    ));
    v_labels := array_append(v_labels, 'Họ và tên');
  end if;

  if v_birth is distinct from v_old.date_of_birth then
    v_changes := v_changes || jsonb_build_object('date_of_birth', jsonb_build_object(
      'label', 'Ngày sinh',
      'old', case when v_old.date_of_birth is null then '' else to_char(v_old.date_of_birth, 'DD/MM/YYYY') end,
      'new', case when v_birth is null then '' else to_char(v_birth, 'DD/MM/YYYY') end
    ));
    v_labels := array_append(v_labels, 'Ngày sinh');
  end if;

  if v_cccd is distinct from coalesce(v_old.cccd, '') then
    v_changes := v_changes || jsonb_build_object('cccd', jsonb_build_object(
      'label', 'CCCD/CMND', 'old', coalesce(v_old.cccd, ''), 'new', v_cccd
    ));
    v_labels := array_append(v_labels, 'CCCD/CMND');
  end if;

  if v_phone is distinct from coalesce(v_old.phone, '') then
    v_changes := v_changes || jsonb_build_object('phone', jsonb_build_object(
      'label', 'Số điện thoại', 'old', coalesce(v_old.phone, ''), 'new', v_phone
    ));
    v_labels := array_append(v_labels, 'Số điện thoại');
  end if;

  if v_address is distinct from coalesce(v_old.address, '') then
    v_changes := v_changes || jsonb_build_object('address', jsonb_build_object(
      'label', 'Địa chỉ', 'old', coalesce(v_old.address, ''), 'new', v_address
    ));
    v_labels := array_append(v_labels, 'Địa chỉ');
  end if;

  if v_photo is distinct from coalesce(v_old.photo_data, '') then
    v_changes := v_changes || jsonb_build_object('photo_data', jsonb_build_object(
      'label', 'Ảnh đại diện',
      'old', case when coalesce(v_old.photo_data, '') = '' then 'Chưa có ảnh' else 'Đã có ảnh' end,
      'new', case when v_photo = '' then 'Đã xóa ảnh' else 'Đã cập nhật ảnh mới' end
    ));
    v_labels := array_append(v_labels, 'Ảnh đại diện');
  end if;

  if coalesce(array_length(v_labels, 1), 0) = 0 then
    return jsonb_build_object(
      'student', public.app_student_portal(p_token),
      'change_id', null,
      'changed_fields', '{}'::jsonb,
      'message', 'Không có thông tin nào thay đổi.'
    );
  end if;

  update public.students
  set name = v_name,
      date_of_birth = v_birth,
      cccd = nullif(v_cccd, ''),
      phone = nullif(v_phone, ''),
      address = nullif(v_address, ''),
      photo_data = nullif(v_photo, '')
  where id = v_student_id;

  v_summary := 'Đã thay đổi: ' || array_to_string(v_labels, ', ');

  insert into public.app_student_profile_changes(
    student_id, student_name, student_code, actor_username,
    changed_fields, change_summary
  ) values (
    v_student_id, v_name, v_old.student_code, v_me->>'username',
    v_changes, v_summary
  ) returning id into v_change_id;

  perform public.app_notify_managers_v2(
    v_student_id,
    'student-profile-change:' || v_change_id,
    'profile',
    'violet',
    '✎',
    'Học viên vừa cập nhật hồ sơ',
    v_name || coalesce(' · ' || nullif(v_old.student_code, ''), '') || ' · ' || v_summary,
    '/?student_profile_change=' || v_change_id,
    'Xem nội dung thay đổi',
    now()
  );

  if to_regclass('public.app_audit_logs') is not null then
    execute $audit$
      insert into public.app_audit_logs(
        actor_id, actor_username, actor_role, action,
        entity_type, entity_id, entity_label, details
      ) values (null, $1, 'student', 'student_profile_updated', 'student', $2, $3, $4)
    $audit$ using v_me->>'username', v_student_id::text, v_name, v_changes;
  end if;

  v_result := public.app_student_portal(p_token);
  return jsonb_build_object(
    'student', v_result,
    'change_id', v_change_id,
    'changed_fields', v_changes,
    'changed_labels', to_jsonb(v_labels),
    'message', 'Đã cập nhật hồ sơ và thông báo cho Admin.'
  );
end;
$$;

create or replace function public.app_admin_get_student_profile_change(
  p_token text,
  p_change_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  v_me jsonb;
  v_result jsonb;
begin
  v_me := public.app_require_admin(p_token);

  update public.app_student_profile_changes
  set reviewed_at = coalesce(reviewed_at, now()),
      reviewed_by = coalesce(reviewed_by, nullif(v_me->>'id', '')::uuid)
  where id = p_change_id;

  select jsonb_build_object(
    'id', change.id,
    'student_id', change.student_id,
    'student_name', change.student_name,
    'student_code', change.student_code,
    'actor_username', change.actor_username,
    'changed_fields', change.changed_fields,
    'change_summary', change.change_summary,
    'created_at', change.created_at,
    'reviewed_at', change.reviewed_at,
    'student_photo', student.photo_data,
    'student_phone', student.phone,
    'student_address', student.address
  ) into v_result
  from public.app_student_profile_changes change
  join public.students student on student.id = change.student_id
  where change.id = p_change_id;

  if v_result is null then
    raise exception 'Không tìm thấy lịch sử thay đổi hồ sơ.';
  end if;

  return v_result;
end;
$$;

create or replace function public.app_admin_list_student_profile_changes(
  p_token text,
  p_limit integer default 50
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  perform public.app_require_admin(p_token);

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', change.id,
      'student_id', change.student_id,
      'student_name', change.student_name,
      'student_code', change.student_code,
      'changed_fields', change.changed_fields,
      'change_summary', change.change_summary,
      'created_at', change.created_at,
      'reviewed_at', change.reviewed_at
    ) order by change.created_at desc)
    from (
      select *
      from public.app_student_profile_changes
      order by created_at desc
      limit greatest(1, least(coalesce(p_limit, 50), 200))
    ) change
  ), '[]'::jsonb);
end;
$$;

grant execute on function public.app_student_update_profile(text, jsonb) to anon, authenticated;
grant execute on function public.app_admin_get_student_profile_change(text, uuid) to anon, authenticated;
grant execute on function public.app_admin_list_student_profile_changes(text, integer) to anon, authenticated;

commit;
