-- KÍCH HOẠT LƯU / XÓA LỊCH ĐÀO TẠO CHỈ DÀNH CHO ADMIN
-- Chạy toàn bộ file này một lần trong Supabase SQL Editor của dự án:
-- ainrsticcgpoqadiaivj

create or replace function public.app_admin_save_student_schedule(
  p_token text,
  p_student_id text,
  p_notes text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_me jsonb;
begin
  v_me := public.app_me(p_token)::jsonb;
  if coalesce(v_me->>'role', '') <> 'admin' then
    raise exception 'Chỉ tài khoản admin được phép cập nhật hoặc xóa lịch đào tạo.';
  end if;

  update public.students
  set notes = coalesce(p_notes, '')
  where id::text = btrim(coalesce(p_student_id, ''));

  if not found then
    raise exception 'Không tìm thấy hồ sơ học viên.';
  end if;
  return true;
exception
  when others then
    if sqlerrm in (
      'Chỉ tài khoản admin được phép cập nhật hoặc xóa lịch đào tạo.',
      'Không tìm thấy hồ sơ học viên.'
    ) then
      raise;
    end if;
    raise exception 'Phiên quản trị không hợp lệ hoặc đã hết hạn.';
end;
$$;

revoke all on function public.app_admin_save_student_schedule(text,text,text) from public;
grant execute on function public.app_admin_save_student_schedule(text,text,text) to anon, authenticated;

select pg_notify('pgrst', 'reload schema');
