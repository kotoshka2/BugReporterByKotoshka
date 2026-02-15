-- ============================================
-- Bug Report Widget — Supabase Database Schema
-- ============================================

-- Таблица клиентов (мульти-тенантность)
-- Каждый клиент получает уникальный api_key,
-- а его Telegram/Notion настройки хранятся здесь.
create table if not exists clients (
  id uuid default gen_random_uuid() primary key,
  api_key text unique not null,
  name text not null default 'Unnamed',

  -- Telegram integration (optional)
  tg_bot_token text,
  tg_chat_id text,

  -- Notion integration (optional)
  notion_key text,
  notion_db_id text,

  -- Widget visibility
  widget_mode text default 'public',   -- 'public' or 'restricted'
  widget_secret_hash text,             -- SHA-256 hash of the access secret

  -- Metadata
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Индекс для быстрого поиска по api_key
create index if not exists idx_clients_api_key on clients (api_key);

-- Таблица логов репортов (опциональная, для аналитики)
create table if not exists reports (
  id uuid default gen_random_uuid() primary key,
  client_id uuid references clients(id) on delete cascade,
  comment text,
  screenshot_url text,
  page_url text,
  browser text,
  os text,
  screen_size text,
  tg_sent boolean default false,
  notion_sent boolean default false,
  created_at timestamptz default now()
);

-- RLS (Row Level Security) — включаем, но пока без политик
-- (политики понадобятся когда появится админка)
alter table clients enable row level security;
alter table reports enable row level security;

-- Для service_role ключа RLS не действует,
-- поэтому Worker сможет читать/писать без проблем.
