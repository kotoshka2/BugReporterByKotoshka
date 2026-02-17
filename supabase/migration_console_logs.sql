-- ============================================
-- Migration: Add console_logs column to reports
-- ============================================
-- Stores captured browser console output (log, warn, error, info)
-- as a JSON array alongside each bug report.

ALTER TABLE reports ADD COLUMN IF NOT EXISTS console_logs jsonb;

-- Optional: add a comment for documentation
COMMENT ON COLUMN reports.console_logs IS 'Captured browser console logs (array of {level, message, timestamp})';
