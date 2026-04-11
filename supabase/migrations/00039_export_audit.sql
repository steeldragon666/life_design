-- Export audit log for clinical data exports (therapist integration)
-- Part of Research-Backed Redesign - Task 30

CREATE TABLE IF NOT EXISTS export_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  export_type text NOT NULL CHECK (export_type IN ('clinical_pdf', 'clinical_json', 'clinical_csv')),
  data_included jsonb NOT NULL DEFAULT '[]',  -- list of data types included
  share_token text UNIQUE,                     -- for shareable links
  share_expires_at timestamptz,
  downloaded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_export_audit_user ON export_audit_log(user_id, created_at DESC);
CREATE INDEX idx_export_audit_token ON export_audit_log(share_token) WHERE share_token IS NOT NULL;

ALTER TABLE export_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own exports" ON export_audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own exports" ON export_audit_log FOR INSERT WITH CHECK (auth.uid() = user_id);
