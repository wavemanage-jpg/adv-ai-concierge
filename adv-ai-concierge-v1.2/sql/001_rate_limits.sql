-- Run ONLY on Supabase project iaphrvoktlelquoqsbjn (ADV-WAVE, not SIG).
CREATE TABLE IF NOT EXISTS concierge.ai_quota (
  quota_key text NOT NULL CHECK (length(quota_key)=64),
  bucket_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  PRIMARY KEY (quota_key, bucket_start)
);
ALTER TABLE concierge.ai_quota ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON concierge.ai_quota FROM PUBLIC, anon, authenticated;
-- Retention: delete bucket rows older than 2 days using a scheduled server job.
