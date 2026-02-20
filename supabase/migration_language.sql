-- ============================================
-- Errora — Language Preference Migration
-- Run AFTER migration_auth.sql
-- ============================================

-- Add language column to clients table (default 'en')
alter table clients add column if not exists language text not null default 'en';

-- Add a check constraint to only allow known values
alter table clients add constraint chk_language check (language in ('en', 'ru'));
