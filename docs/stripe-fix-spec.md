# Stripe Fix Spec — for Justin (2026-06-09)

Five bugs, all verified against the code (file:line cited). Bug 1 is why nobody can become a paying customer; the rest follow in order. SQL for Brandon to run is collected in §0.

**The unifying failure mode:** every Supabase write in the webhook discards its result (`await admin.from(...).upsert(...)` with no `error` check), and the handler returns `{ received: true }` 200 regardless. So nothing throws, Stripe never retries, and the database silently stays empty. Fix the error handling first and the other bugs become visible instead of invisible.

---

## §0 — SQL (Brandon runs in Supabase, as migrations)

```sql
-- 1. The upsert target. Without this, every webhook upsert fails with 42P10.
--    (If subscriptions already has duplicate user_id rows, dedupe first.)
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_user_id_key UNIQUE (user_id);

-- 2. Customer reuse (Bug 5). Webhook stores it; checkout reuses it.
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- 3. Idempotency (Bug 4). Stripe re-delivers events; dedupe on event id.
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id text PRIMARY KEY,
  type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE stripe_events ENABLE ROW LEVEL SECURITY;
-- No policies: service-role only. RLS on with no policies = nobody else reads.
```

---

## Bug 1 — Subscription upsert always fails, silently
**Where:** `app/api/stripe/webhook/route.ts:85-97`
**What:** `upsert({...}, { onConflict: "user_id" })` requires a UNIQUE constraint on `subscriptions.user_id`; the table (migration `20250204054754:59`) has none. Postgres rejects with 42P10. supabase-js returns the error in the result object — it does **not** throw — and the result is discarded, so the catch never fires and Stripe gets a 200.
**Fix:** §0.1 constraint, plus check every write:

```ts
const { error: upsertError } = await admin.from("subscriptions").upsert(
  {
    user_id: userId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer as string, // Bug 5 support
    status: subscription.status,
    plan,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  },
  { onConflict: "user_id" },
);
if (upsertError) throw new Error(`subscriptions upsert: ${upsertError.message}`);
```

Apply the same `if (error) throw` pattern to the `update` calls at lines 107-117 and 124-130 and both `payments` inserts. The existing catch at line 177 already returns 500 — throwing is what makes Stripe retry.

## Bug 2 — Payments insert uses a column that doesn't exist
**Where:** `webhook/route.ts:148` and `:162` — `stripe_invoice_id: invoice.id`
**What:** the `payments` table column is `stripe_payment_id` (migration `20250204054754:77`). Every insert fails; silently, per Bug 1's pattern.
**Fix:** rename the key to `stripe_payment_id` in both inserts (or add a `stripe_invoice_id` column — renaming the key is less churn).

## Bug 3 — Payments are never attributed to a user
**Where:** `webhook/route.ts:147` — `user_id: null, // Will be looked up via subscription` (the lookup doesn't exist)
**What:** even after Bug 2 is fixed, rows are orphaned — and invisible to the user's RLS SELECT policy (`auth.uid() = user_id`).
**Fix:** in both invoice handlers, resolve the user before inserting:

```ts
const { data: subRow } = await admin
  .from("subscriptions")
  .select("user_id")
  .eq("stripe_subscription_id", subscriptionId)
  .maybeSingle();

await admin.from("payments").insert({
  user_id: subRow?.user_id ?? null,
  stripe_payment_id: invoice.id,
  ...
});
```

Note: `invoice.payment_failed` (line 157) currently has no `subscriptionId` extraction — copy the dual-shape read from lines 139-142 into that case too. Optional but recommended while there: on payment failure, also set the subscription row's `status` to the subscription's current Stripe status so dunning state isn't invisible between `customer.subscription.updated` events.

## Bug 4 — No idempotency
**Where:** whole handler (`webhook/route.ts:66-174`)
**What:** Stripe retries and can double-deliver. Once Bugs 1-3 are fixed, a replayed `invoice.payment_succeeded` inserts a duplicate payment row.
**Fix:** right after signature verification (line 62), claim the event id; bail if already seen:

```ts
const { error: claimError } = await admin
  .from("stripe_events")
  .insert({ event_id: event.id, type: event.type });
if (claimError) {
  if (claimError.code === "23505") {
    return NextResponse.json({ received: true, duplicate: true });
  }
  // Can't guarantee idempotency — let Stripe retry.
  return NextResponse.json({ error: "Event claim failed" }, { status: 500 });
}
```

## Bug 5 — Checkout fragments customers and allows double-subscribing
**Where:** `app/api/stripe/checkout/route.ts:42-58`
**What:** the `subscriptions` lookup result is assigned and never used; the session is created with `customer_email` only, which mints a **new** Stripe customer on every checkout; nothing blocks a user who already has an active subscription from buying a second one.
**Fix:**

```ts
const { data: existing } = await supabase
  .from("subscriptions")
  .select("status, stripe_customer_id")
  .eq("user_id", user.id)
  .maybeSingle();

if (existing?.status === "active") {
  return NextResponse.json(
    { error: "You already have an active subscription. Manage it from Settings." },
    { status: 409 },
  );
}

const sessionParams: Record<string, unknown> = {
  mode: "subscription",
  payment_method_types: ["card"],
  line_items: [{ price: priceId, quantity: 1 }],
  success_url: `${baseUrl}/settings?checkout=success`,
  cancel_url: `${baseUrl}/pricing?checkout=cancelled`,
  metadata: { user_id: user.id },
  // Reuse the Stripe customer when we have one; otherwise let Stripe
  // create one keyed to the email.
  ...(existing?.stripe_customer_id
    ? { customer: existing.stripe_customer_id }
    : { customer_email: user.email }),
};
```

Also consider `subscription_data: { metadata: { user_id: user.id } }` so the user id rides on the subscription object itself, not only the checkout session — useful if you ever handle `customer.subscription.created`.

## Bug 6 (UI) — Billing is unreachable
- `app/pricing/page.tsx:158-171`: the upgrade `<Button>` renders `plan.cta` and does nothing. It needs an onClick that POSTs `{ priceKey }` to `/api/stripe/checkout` and redirects to the returned `url`. The route expects `priceKey` ∈ `visionary_monthly | visionary_yearly | prophet_monthly | prophet_yearly` (see `PLAN_PRICES`, `lib/stripe.ts`) — map each plan card + billing-period toggle to one of those keys.
- `app/settings/_components/sections/plan-section.tsx:118`: paid users only get a link back to `/pricing`. Add a "Manage billing" button for users with a subscription row that POSTs to `/api/stripe/portal` and redirects to the returned `url` (the portal route is already correct).
- Reminder: `PLAN_PRICES` env vars must hold the **live-mode** price IDs in prod and test-mode IDs in preview.

## Acceptance test (Stripe test mode, end to end)
1. Checkout with `4242 4242 4242 4242` → webhook fires → `subscriptions` row exists with correct `plan`, `status='active'`, `stripe_customer_id` set.
2. Submit a dream → analysis depth matches the paid tier (server clamps via `clampDepthToPlan`).
3. In Stripe dashboard, resend the same `checkout.session.completed` event → response shows `duplicate: true`, no second row, no duplicate payment.
4. Attempt checkout again while active → 409.
5. Cancel via the portal → `customer.subscription.deleted` → row status `canceled` → next dream submission clamps to shallow.
6. `payments` table has rows with non-null `user_id` after an invoice event.

Items 1-5 are the **Money gate** in `MVP_LAUNCH_CHECKLIST.md`.
