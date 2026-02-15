-- Migration: Add allowed_domains to clients table
-- Run this in Supabase SQL Editor

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS allowed_domains text[] DEFAULT NULL;

-- NULL means no domain restriction (allow all).
-- When set, only requests from these domains are accepted.
-- Example value: ARRAY['https://example.com', 'https://app.example.com']

COMMENT ON COLUMN clients.allowed_domains IS 'List of allowed origin domains. NULL = allow all.';
