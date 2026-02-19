-- Migration: Add Notion OAuth columns to clients table
-- Run this in Supabase SQL Editor

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS notion_access_token TEXT,
ADD COLUMN IF NOT EXISTS notion_workspace_name TEXT,
ADD COLUMN IF NOT EXISTS notion_bot_id TEXT,
ADD COLUMN IF NOT EXISTS notion_db_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN clients.notion_access_token IS 'OAuth access token from Notion public integration';
COMMENT ON COLUMN clients.notion_workspace_name IS 'Notion workspace name (for display in dashboard)';
COMMENT ON COLUMN clients.notion_bot_id IS 'Notion bot ID from OAuth exchange';
COMMENT ON COLUMN clients.notion_db_url IS 'URL to the auto-created Notion bug reports database';
