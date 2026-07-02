# Testing Stripe (sandbox / test mode)

The Stripe sandbox mirrors the live setup — no real money moves. Everything
below was created on 2026-07-02 in the DreamRiver Technologies LLC sandbox.

## Test price IDs (product `prod_UoOd99WTbCoANZ`)

| Env var | Amount | Test price ID |
| --- | --- | --- |
| `STRIPE_PRICE_VISIONARY_MONTHLY` | $12.99/mo | `price_1TolqLFMiyoPHYT4nlbbfhYS` |
| `STRIPE_PRICE_VISIONARY_YEARLY` | $99.99/yr | `price_1TolruFMiyoPHYT4uEyuDLi3` |
| `STRIPE_PRICE_PROPHET_MONTHLY` | $19.99/mo | `price_1TolsKFMiyoPHYT40EfgdxL9` |
| `STRIPE_PRICE_PROPHET_YEARLY` | $179.99/yr | `price_1TolsbFMiyoPHYT4GNTASwXx` |

## One-time setup (local)

1. Install the Stripe CLI: `brew install stripe/stripe-cli/stripe`, then `stripe login`.
2. In `.env.local`, set the test values (test keys live in Dashboard → toggle
   **Test mode** → Developers → API keys):

   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…
   STRIPE_SECRET_KEY=sk_test_…
   STRIPE_PRICE_VISIONARY_MONTHLY=price_1TolqLFMiyoPHYT4nlbbfhYS
   STRIPE_PRICE_VISIONARY_YEARLY=price_1TolruFMiyoPHYT4uEyuDLi3
   STRIPE_PRICE_PROPHET_MONTHLY=price_1TolsKFMiyoPHYT40EfgdxL9
   STRIPE_PRICE_PROPHET_YEARLY=price_1TolsbFMiyoPHYT4GNTASwXx
   # STRIPE_WEBHOOK_SECRET comes from `stripe listen` (step 3), whsec_…
   ```

   ⚠️ Don't commit real keys; `.env.local` is already gitignored. Restore the
   live values (or just delete the test overrides) when done.

## Each test session

```bash
# terminal 1
npm run dev
# terminal 2 — prints a whsec_… ; put it in .env.local as STRIPE_WEBHOOK_SECRET, restart dev
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Then on http://localhost:3000/pricing:

1. Subscribe with card **4242 4242 4242 4242**, any future expiry, any CVC/ZIP.
2. Watch terminal 2 — `checkout.session.completed` should forward and get a 200.
3. Check Supabase `subscriptions`: row for your user, correct plan, status `active`.
4. Confirm the app unlocks the paid tier (credits, features).
5. Failure path: card `4000 0000 0000 0341` (attaches, then fails payment) →
   expect `invoice.payment_failed` handling.
6. Cancel via Stripe test dashboard → `customer.subscription.deleted` → app downgrades.

## Live smoke test (once, before enabling Prophet tier)

Real card on dreamriver.io → verify webhook 200 in Workbench → Webhooks →
dreamriver-production → Event deliveries → then cancel + refund in dashboard.
