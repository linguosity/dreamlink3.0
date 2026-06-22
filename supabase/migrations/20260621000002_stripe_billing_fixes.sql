-- ============================================================
-- Stripe billing fixes (per docs/stripe-fix-spec.md §0)
-- ------------------------------------------------------------
-- These three changes make the checkout → webhook → active-subscription
-- flow actually persist:
--   1. UNIQUE(user_id) so the webhook's upsert(onConflict: "user_id")
--      stops failing with Postgres 42P10 (Bug 1).
--   2. stripe_customer_id so checkout can reuse a customer instead of
--      minting a new one every time (Bug 5).
--   3. stripe_events for webhook idempotency — Stripe re-delivers events,
--      and without dedupe a replay double-inserts payments (Bug 4).
--
-- NOTE: if `subscriptions` already has duplicate user_id rows, dedupe them
-- before this runs or the UNIQUE constraint will fail to create.
-- ============================================================

-- 1. Upsert target for the webhook.
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);

-- 2. Customer reuse: webhook stores it, checkout reuses it.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- 3. Idempotency ledger: one row per processed Stripe event id.
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id text PRIMARY KEY,
  type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

-- Service-role only: RLS enabled with no policies means no anon/auth reads.
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
