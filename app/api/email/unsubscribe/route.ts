// app/api/email/unsubscribe/route.ts
//
// True one-click unsubscribe for recurring lifecycle email. No login: the
// link carries ?uid=<user id>&type=<email type>&token=<HMAC-SHA256 hex>,
// signed with CRON_SECRET (lib/emails/unsubscribe.ts), so possessing the
// link proves we emailed that user. Verifying flips the matching
// profile.preferences key to false (morning_reminder → dreamReminders,
// weekly_digest → weeklyDigest — see lib/emails/preferences.ts) and renders
// a tiny branded confirmation page. Idempotent: clicking twice is fine.
//
// GET because email footers are plain links; POST behaves identically so a
// future RFC 8058 List-Unsubscribe-Post header can point here too. 503 when
// CRON_SECRET is unset (tokens can't be verified → feature dark), 400 on a
// bad link — same fail-safe posture as the cron routes.

import { NextResponse } from "next/server";
import { getAdminClient } from "@/utils/supabase/admin";
import {
  isUnsubscribeEmailType,
  verifyUnsubscribeToken,
} from "@/lib/emails/unsubscribe";
import { PREF_KEY_BY_EMAIL_TYPE } from "@/lib/emails/preferences";
import { captureError } from "@/lib/sentry";
import type { Json } from "@/lib/database.types";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Minimal branded page, email-footer-click friendly. Static copy only. */
function htmlPage(title: string, message: string, status: number): NextResponse {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="robots" content="noindex"/>
<title>${title} · DreamRiver</title>
</head>
<body style="margin:0; padding:48px 16px; background-color:#070A24; font-family:Arial, Helvetica, sans-serif;">
  <div style="max-width:480px; margin:0 auto; text-align:center;">
    <div style="font-family:'Trebuchet MS', Verdana, sans-serif; font-weight:bold; font-size:24px; letter-spacing:1px; color:#F0EFFC; margin-bottom:22px;"><span style="color:#B39BFF;">&#10022;</span>&nbsp;DreamRiver</div>
    <div style="background-color:#0E1440; border:1px solid #252C66; border-radius:12px; padding:36px 32px; text-align:left;">
      <h1 style="margin:0 0 14px 0; font-family:Georgia, 'Times New Roman', serif; font-size:22px; font-weight:normal; color:#F0EFFC;">${title}</h1>
      <p style="margin:0; font-size:15px; line-height:1.65; color:#C7CCEC;">${message}</p>
      <p style="margin:18px 0 0 0; font-size:13px; line-height:1.6; color:#8790BE;">You can change this anytime in <a href="https://dreamriver.io/settings" style="color:#B39BFF;">Settings</a>.</p>
    </div>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

async function handleUnsubscribe(request: Request): Promise<NextResponse> {
  if (!process.env.CRON_SECRET) {
    return htmlPage(
      "Link unavailable",
      "Unsubscribe links aren't available right now — please manage your email preferences from Settings instead.",
      503,
    );
  }

  const url = new URL(request.url);
  const uid = url.searchParams.get("uid") ?? "";
  const type = url.searchParams.get("type");
  const token = url.searchParams.get("token");

  if (
    !UUID_RE.test(uid) ||
    !isUnsubscribeEmailType(type) ||
    !verifyUnsubscribeToken(uid, type, token)
  ) {
    return htmlPage(
      "That link didn't work",
      "This unsubscribe link is invalid or incomplete. You can manage all email preferences from Settings.",
      400,
    );
  }

  try {
    const admin = getAdminClient();
    const { data: row, error: readError } = await admin
      .from("profile")
      .select("preferences")
      .eq("user_id", uid)
      .maybeSingle();
    if (readError) throw new Error(`preferences read failed: ${readError.message}`);

    // Missing profile (deleted account) → nothing to flip; still confirm.
    if (row) {
      const current =
        row.preferences && typeof row.preferences === "object" && !Array.isArray(row.preferences)
          ? (row.preferences as Record<string, unknown>)
          : {};
      const next = { ...current, [PREF_KEY_BY_EMAIL_TYPE[type]]: false } as Json;
      const { error: writeError } = await admin
        .from("profile")
        .update({ preferences: next })
        .eq("user_id", uid);
      if (writeError) throw new Error(`preferences write failed: ${writeError.message}`);
    }

    const what =
      type === "morning_reminder" ? "morning dream reminders" : "the weekly digest";
    return htmlPage(
      "You're unsubscribed",
      `Done — you won't receive ${what} anymore. Your journal is untouched and waiting whenever you are.`,
      200,
    );
  } catch (err) {
    console.error("[unsubscribe] failed:", err);
    captureError(err, {
      level: "error",
      tags: { area: "email", route: "unsubscribe" },
    });
    return htmlPage(
      "Something went wrong",
      "We couldn't update your preferences just now. Please try the link again in a moment, or use Settings.",
      500,
    );
  }
}

export async function GET(request: Request) {
  return handleUnsubscribe(request);
}

// RFC 8058 one-click compatibility: mail clients POST with no body.
export async function POST(request: Request) {
  return handleUnsubscribe(request);
}
