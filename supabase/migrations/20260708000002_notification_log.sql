-- ============================================================
-- notification_log — lifecycle email dedupe ledger
-- ------------------------------------------------------------
-- One row per (user, email type, dedupe key) lifecycle email we have
-- sent (welcome, credits_exhausted, payment_failed,
-- cancellation_confirmed). lib/emails/send.ts INSERTS FIRST (claims
-- the key) and only calls Resend when the insert succeeds; a 23505
-- unique violation means "already sent" and the send is skipped.
-- Same claim-first idempotency pattern as stripe_events.
--
-- Dedupe keys per type:
--   welcome                → 'once'            (once per user, ever)
--   credits_exhausted      → 'once'            (free credits are lifetime,
--                                               never refresh → once ever)
--   payment_failed         → <stripe invoice>  (once per failed invoice,
--                                               not per retry attempt)
--   cancellation_confirmed → <sub>:<period>    (once per subscription period)
-- ============================================================

CREATE TABLE IF NOT EXISTS notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  dedupe_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, type, dedupe_key)
);

-- Service-role only: RLS enabled with no policies means no anon/authenticated
-- access (same pattern as stripe_events). All reads/writes go through the
-- admin client in server code.
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;
