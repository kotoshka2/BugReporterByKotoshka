-- Add status columns to existing jira_integrations table
ALTER TABLE jira_integrations
  ADD COLUMN IF NOT EXISTS default_status_id   text,
  ADD COLUMN IF NOT EXISTS default_status_name text;
