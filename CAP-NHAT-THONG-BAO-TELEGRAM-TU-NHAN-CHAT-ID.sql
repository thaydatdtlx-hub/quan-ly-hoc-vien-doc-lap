-- THONG BAO TELEGRAM TU NHAN CHAT ID
-- Chay file nay mot lan trong Supabase SQL Editor.

begin;

create table if not exists public.app_telegram_admin_chats (
  slot text primary key default 'primary',
  chat_id bigint not null unique,
  telegram_user_id bigint,
  telegram_username text,
  first_name text,
  active boolean not null default true,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint app_telegram_admin_chats_slot_check check (slot = 'primary')
);

alter table public.app_telegram_admin_chats enable row level security;
revoke all on public.app_telegram_admin_chats from public, anon, authenticated;

create table if not exists public.app_telegram_delivery_log (
  notification_key text primary key,
  registration_id uuid references public.new_student_registrations(id) on delete set null,
  chat_id bigint,
  status text not null default 'processing'
    check (status in ('processing','sent','failed')),
  provider_response jsonb,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_telegram_delivery_log enable row level security;
revoke all on public.app_telegram_delivery_log from public, anon, authenticated;

commit;

select
  to_regclass('public.app_telegram_admin_chats') as telegram_chat_table,
  to_regclass('public.app_telegram_delivery_log') as telegram_delivery_log;
