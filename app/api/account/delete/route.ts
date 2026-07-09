import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { getStripe } from "@/lib/stripe";
import { captureError } from "@/lib/sentry";

/**
 * POST /api/account/delete
 *
 * Self-serve account deletion. Requires an authenticated session and an
 * explicit body of { "confirm": "DELETE" }.
 *
 * Order of operations (fail-safe: billing stops before data disappears):
 *   1. If the user has any Stripe subscription that can still bill, set
 *      cancel_at_period_end via the Stripe API. If Stripe can't be reached
 *      we ABORT with 502 rather than delete an account that would keep
 *      getting charged with no way to log in and cancel.
 *   2. Remove the user's dream images from the private `dream-images`
 *      bucket (objects are keyed by dreamId, so we enumerate dreams first;
 *      storage does NOT cascade with DB rows). Best-effort: failures are
 *      reported to Sentry but don't block deletion — the bucket is private
 *      and orphaned objects are unreadable.
 *   3. Best-effort removal of the account email from newsletter_signups.
 *   4. auth.admin.deleteUser(user.id) — DB rows are removed by the
 *      ON DELETE CASCADE / SET NULL chain (see migration
 *      20260708000001_account_deletion_cascades.sql).
 *   5. supabase.auth.signOut() to clear the session cookies.
 */

const BUCKET = "dream-images";

/** Stripe statuses that can still bill (or convert into billing) the customer. */
const CANCELABLE_STRIPE_STATUSES = new Set([
  "active",
  "trialing",
  "past_due",
  "unpaid",
  "paused",
  "incomplete",
]);

/**
 * Delete every object under `dream-images/<dreamId>/` for the given dreams.
 * Returns the number of dreams whose folder listing or removal failed.
 */
async function deleteDreamImages(
  admin: ReturnType<typeof getAdminClient>,
  dreamIds: string[],
): Promise<number> {
  let failures = 0;
  const paths: string[] = [];

  // List folders in small parallel batches; a missing folder lists as [].
  const LIST_BATCH = 10;
  for (let i = 0; i < dreamIds.length; i += LIST_BATCH) {
    const batch = dreamIds.slice(i, i + LIST_BATCH);
    const results = await Promise.all(
      batch.map(async (dreamId) => {
        const { data, error } = await admin.storage.from(BUCKET).list(dreamId);
        if (error) {
          failures += 1;
          return [] as string[];
        }
        return (data ?? []).map((file) => `${dreamId}/${file.name}`);
      }),
    );
    for (const r of results) paths.push(...r);
  }

  const REMOVE_BATCH = 200;
  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const chunk = paths.slice(i, i + REMOVE_BATCH);
    const { error } = await admin.storage.from(BUCKET).remove(chunk);
    if (error) failures += 1;
  }

  return failures;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    if (!body || body.confirm !== "DELETE") {
      return NextResponse.json(
        { error: 'Confirmation required: send { "confirm": "DELETE" }.' },
        { status: 400 },
      );
    }

    const admin = getAdminClient();

    // ------------------------------------------------------------------
    // 1) Stop billing first.
    // ------------------------------------------------------------------
    const { data: subRows, error: subError } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .not("stripe_subscription_id", "is", null);

    if (subError) {
      captureError(
        new Error(`account-delete: subscription lookup failed: ${subError.message}`),
        { tags: { area: "account-deletion" }, extra: { userId: user.id } },
      );
      return NextResponse.json(
        { error: "Could not verify your subscription. Please try again." },
        { status: 500 },
      );
    }

    const subscriptionIds = Array.from(
      new Set(
        (subRows ?? [])
          .map((row) => row.stripe_subscription_id)
          .filter((id): id is string => Boolean(id)),
      ),
    );

    if (subscriptionIds.length > 0) {
      try {
        const stripe = getStripe();
        for (const subscriptionId of subscriptionIds) {
          try {
            const sub = await stripe.subscriptions.retrieve(subscriptionId);
            if (
              CANCELABLE_STRIPE_STATUSES.has(sub.status) &&
              !sub.cancel_at_period_end
            ) {
              // Cancel at period end: no proration/refund complexity, no
              // further charges. The account is gone immediately regardless.
              await stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: true,
              });
            }
          } catch (err) {
            // Already deleted on Stripe's side (stale local row) — fine.
            if ((err as { code?: string })?.code === "resource_missing") continue;
            throw err;
          }
        }
      } catch (err) {
        captureError(err, {
          tags: { area: "account-deletion" },
          extra: { userId: user.id, subscriptionIds },
        });
        // Fail safe: never delete the account while Stripe may keep billing.
        return NextResponse.json(
          {
            error:
              "We couldn't cancel your subscription automatically. Please cancel it under Plan & Billing → Manage billing, then try deleting your account again.",
          },
          { status: 502 },
        );
      }
    }

    // ------------------------------------------------------------------
    // 2) Remove dream images (enumerate BEFORE the cascade wipes the rows).
    // ------------------------------------------------------------------
    const { data: dreamRows, error: dreamsError } = await admin
      .from("dream_entries")
      .select("id")
      .eq("user_id", user.id);

    if (dreamsError) {
      captureError(
        new Error(`account-delete: dream enumeration failed: ${dreamsError.message}`),
        { tags: { area: "account-deletion" }, extra: { userId: user.id } },
      );
      return NextResponse.json(
        { error: "Could not prepare your data for deletion. Please try again." },
        { status: 500 },
      );
    }

    const dreamIds = (dreamRows ?? []).map((d) => d.id);
    const storageFailures = await deleteDreamImages(admin, dreamIds);
    if (storageFailures > 0) {
      // Non-fatal: bucket is private, orphans are unreadable. Alert ops so
      // they can sweep manually.
      captureError(
        new Error("account-delete: some dream images could not be removed"),
        {
          level: "warning",
          tags: { area: "account-deletion" },
          extra: { userId: user.id, storageFailures, dreamCount: dreamIds.length },
        },
      );
    }

    // ------------------------------------------------------------------
    // 3) Best-effort: drop their email from the newsletter list (keyed by
    //    email, so no FK/cascade can cover it).
    // ------------------------------------------------------------------
    if (user.email) {
      const { error: newsletterError } = await admin
        .from("newsletter_signups")
        .delete()
        .eq("email", user.email);
      if (newsletterError) {
        console.error(
          "[account-delete] newsletter cleanup failed:",
          newsletterError.message,
        );
      }
    }

    // ------------------------------------------------------------------
    // 4) Delete the auth user. DB rows go via ON DELETE CASCADE / SET NULL.
    // ------------------------------------------------------------------
    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
    if (deleteError) {
      captureError(
        new Error(`account-delete: auth deleteUser failed: ${deleteError.message}`),
        { tags: { area: "account-deletion" }, extra: { userId: user.id } },
      );
      return NextResponse.json(
        { error: "Failed to delete your account. Please try again or contact support." },
        { status: 500 },
      );
    }

    console.log(
      `[account-delete] user ${user.id} deleted (dreams=${dreamIds.length}, subscriptionsCanceled=${subscriptionIds.length})`,
    );

    // ------------------------------------------------------------------
    // 5) Clear session cookies. The server-side session is already gone, so
    //    signOut may 4xx against the API — supabase-js still clears locally.
    // ------------------------------------------------------------------
    try {
      await supabase.auth.signOut();
    } catch {
      // Cookies best-effort; the session is invalid either way.
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Account deletion error:", error);
    captureError(error, { tags: { area: "account-deletion" } });
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 },
    );
  }
}
