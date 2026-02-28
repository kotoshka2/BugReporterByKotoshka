-- Create separate table for Jira integration settings
CREATE TABLE IF NOT EXISTS jira_integrations (
    id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id      uuid NOT NULL UNIQUE REFERENCES clients(id) ON DELETE CASCADE,
    access_token   text,
    refresh_token  text,
    cloud_id       text,
    workspace_name text,
    project_key    text,
    created_at     timestamptz DEFAULT now(),
    updated_at     timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE jira_integrations ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own rows
CREATE POLICY "Users can manage their own jira integration"
    ON jira_integrations
    FOR ALL
    USING (true)
    WITH CHECK (true);
