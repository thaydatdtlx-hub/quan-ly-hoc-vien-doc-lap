-- BƯỚC 12: THÔNG BÁO ĐẨY RA MÀN HÌNH ĐIỆN THOẠI
-- Yêu cầu đã chạy CAP-NHAT-TRUNG-TAM-THONG-BAO-BUOC-11.sql.
-- Chạy toàn bộ file này trong Supabase SQL Editor đúng 1 lần.

begin;

do $$
begin
  if to_regclass('public.app_notifications') is null then
    raise exception 'Cần chạy CAP-NHAT-TRUNG-TAM-THONG-BAO-BUOC-11.sql trước.';
  end if;
end;
$$;

create table if not exists public.app_push_subscriptions (
  endpoint text primary key,
  recipient_kind text not null check (recipient_kind in ('manager','student')),
  recipient_id uuid not null,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  last_error text,
  last_error_at timestamptz
);

create index if not exists app_push_subscriptions_recipient_idx
  on public.app_push_subscriptions(recipient_kind,recipient_id)
  where active;

alter table public.app_push_subscriptions enable row level security;
revoke all on public.app_push_subscriptions from anon,authenticated;

create or replace function public.app_save_push_subscription(
  p_token text,
  p_subscription jsonb,
  p_user_agent text default ''
)
returns boolean
language plpgsql
security definer
set search_path=public,extensions,pg_temp
as $$
declare
  v_me jsonb;
  v_kind text;
  v_endpoint text:=btrim(coalesce(p_subscription->>'endpoint',''));
  v_p256dh text:=btrim(coalesce(p_subscription#>>'{keys,p256dh}',''));
  v_auth text:=btrim(coalesce(p_subscription#>>'{keys,auth}',''));
begin
  begin
    v_me:=public.app_me(p_token);
    v_kind:='manager';
  exception when others then
    v_me:=public.app_student_me(p_token);
    if coalesce(v_me->>'role','')<>'student' then raise exception 'Tài khoản không hỗ trợ thông báo đẩy.';end if;
    v_kind:='student';
  end;

  if v_endpoint='' or v_endpoint!~'^https://' or length(v_endpoint)>1000 then raise exception 'Địa chỉ thiết bị không hợp lệ.';end if;
  if v_p256dh='' or v_auth='' or length(v_p256dh)>500 or length(v_auth)>500 then raise exception 'Khóa đăng ký thiết bị không hợp lệ.';end if;

  insert into public.app_push_subscriptions(endpoint,recipient_kind,recipient_id,p256dh,auth,user_agent,active,updated_at,last_seen_at,last_error,last_error_at)
  values(v_endpoint,v_kind,(v_me->>'id')::uuid,v_p256dh,v_auth,left(coalesce(p_user_agent,''),500),true,now(),now(),null,null)
  on conflict(endpoint) do update set
    recipient_kind=excluded.recipient_kind,
    recipient_id=excluded.recipient_id,
    p256dh=excluded.p256dh,
    auth=excluded.auth,
    user_agent=excluded.user_agent,
    active=true,
    updated_at=now(),
    last_seen_at=now(),
    last_error=null,
    last_error_at=null;
  return true;
end;
$$;

create or replace function public.app_disable_push_subscription(p_token text,p_endpoint text)
returns boolean
language plpgsql
security definer
set search_path=public,extensions,pg_temp
as $$
declare v_me jsonb;v_kind text;
begin
  begin v_me:=public.app_me(p_token);v_kind:='manager';
  exception when others then
    v_me:=public.app_student_me(p_token);
    if coalesce(v_me->>'role','')<>'student' then raise exception 'Tài khoản không hỗ trợ thông báo đẩy.';end if;
    v_kind:='student';
  end;
  update public.app_push_subscriptions set active=false,updated_at=now()
  where endpoint=p_endpoint and recipient_kind=v_kind and recipient_id::text=v_me->>'id';
  return found;
end;
$$;

create or replace function public.app_create_push_test_notification(p_token text)
returns uuid
language plpgsql
security definer
set search_path=public,extensions,pg_temp
as $$
declare v_me jsonb;v_kind text;v_id uuid;
begin
  begin v_me:=public.app_me(p_token);v_kind:='manager';
  exception when others then
    v_me:=public.app_student_me(p_token);
    if coalesce(v_me->>'role','')<>'student' then raise exception 'Tài khoản không hỗ trợ thông báo đẩy.';end if;
    v_kind:='student';
  end;
  insert into public.app_notifications(recipient_kind,recipient_id,notification_key,category,tone,icon,title,body,href,action_label,event_at)
  values(v_kind,(v_me->>'id')::uuid,'push-test:'||(v_me->>'id')||':'||extensions.gen_random_uuid(),'general','green','🔔','Thông báo điện thoại đã hoạt động','Thiết bị này đã nhận được thông báo đẩy từ hệ thống Thầy Đạt.',case when v_kind='student' then '/hoc-vien.html' else '/' end,'Mở ứng dụng',now())
  returning id into v_id;
  return v_id;
end;
$$;

revoke all on function public.app_save_push_subscription(text,jsonb,text) from public;
revoke all on function public.app_disable_push_subscription(text,text) from public;
revoke all on function public.app_create_push_test_notification(text) from public;
grant execute on function public.app_save_push_subscription(text,jsonb,text) to anon,authenticated;
grant execute on function public.app_disable_push_subscription(text,text) to anon,authenticated;
grant execute on function public.app_create_push_test_notification(text) to anon,authenticated;

select pg_notify('pgrst','reload schema');
commit;

select to_regclass('public.app_push_subscriptions') as push_subscriptions,
  to_regprocedure('public.app_save_push_subscription(text,jsonb,text)') as save_subscription,
  to_regprocedure('public.app_create_push_test_notification(text)') as test_push;
