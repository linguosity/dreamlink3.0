// app/api/feedback/route.ts
//
// In-app feedback → support inbox. POST { category, message, path } from the
// floating FeedbackWidget; we forward it to SUPPORT_EMAIL via Resend with the
// sender's account email as Reply-To so support can answer directly.
//
// Deliberately self-contained: Resend is instantiated here rather than via
// lib/resend.ts so this route has no coupling to the lifecycle-email module.

import { NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@/utils/supabase/server";

const MIN_CHARS = 10;
const MAX_CHARS = 2000;
const DAILY_CAP = 5;

const CATEGORY_LABELS: Record<string, string> = {
  bug: "Bug",
  idea: "Idea",
  other: "Other",
};

// Per-user daily cap, in memory. On serverless this map lives only as long as
// the instance (each cold start / concurrent instance gets its own empty map),
// so it's a soft cap: enough to stop a stuck client or an enthusiastic user
// from flooding the support inbox, not a hard security boundary. If feedback
// volume ever justifies it, move this to the same DB-count pattern as
// lib/rateLimit.ts.
const feedbackCounts = new Map<string, { day: string; count: number }>();

function underDailyCap(userId: string): boolean {
  const today = new Date().toISOString().slice(0, 10);

  // Opportunistic cleanup so the map can't grow unbounded on a long-lived
  // instance (self-hosted / dev server).
  if (feedbackCounts.size > 500) {
    for (const [key, value] of feedbackCounts) {
      if (value.day !== today) feedbackCounts.delete(key);
    }
  }

  const entry = feedbackCounts.get(userId);
  if (!entry || entry.day !== today) {
    feedbackCounts.set(userId, { day: today, count: 1 });
    return true;
  }
  if (entry.count >= DAILY_CAP) return false;
  entry.count += 1;
  return true;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "You must be signed in to send feedback." },
      { status: 401 },
    );
  }

  let body: { category?: unknown; message?: unknown; path?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const category =
    typeof body.category === "string" ? body.category.toLowerCase() : "";
  if (!(category in CATEGORY_LABELS)) {
    return NextResponse.json(
      { error: "Category must be one of: bug, idea, other." },
      { status: 400 },
    );
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length < MIN_CHARS) {
    return NextResponse.json(
      { error: `Please say a little more (at least ${MIN_CHARS} characters).` },
      { status: 400 },
    );
  }
  if (message.length > MAX_CHARS) {
    return NextResponse.json(
      { error: `Feedback is limited to ${MAX_CHARS} characters.` },
      { status: 400 },
    );
  }

  // Where the user was when they opened the widget — context for triage only,
  // so cap and flatten it rather than rejecting odd values.
  const path =
    typeof body.path === "string" && body.path.length > 0
      ? body.path.replace(/[\r\n]/g, " ").slice(0, 300)
      : "(unknown)";

  const supportEmail = process.env.SUPPORT_EMAIL || "DreamRiverTechnologies@gmail.com";

  if (!process.env.RESEND_API_KEY) {
    // Friendly degradation: the widget shows this message verbatim.
    return NextResponse.json(
      {
        error: `Feedback isn't set up on this server yet — please email us directly at ${supportEmail}.`,
      },
      { status: 503 },
    );
  }

  if (!underDailyCap(user.id)) {
    return NextResponse.json(
      {
        error:
          "You've reached today's feedback limit — thank you for all of it! Please try again tomorrow.",
      },
      { status: 429 },
    );
  }

  const categoryLabel = CATEGORY_LABELS[category];
  const fromIdentity = user.email ?? user.id;

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error: sendError } = await resend.emails.send({
      // Same sender convention as lib/resend.ts (kept in sync by hand — this
      // route intentionally doesn't import that module).
      from: process.env.EMAIL_FROM || "DreamRiver <hello@dreamriver.io>",
      to: supportEmail,
      ...(user.email ? { replyTo: user.email } : {}),
      subject: `[DreamRiver feedback] ${categoryLabel} — ${fromIdentity}`,
      // Plain text on purpose: no HTML rendering of user-supplied content.
      text: [
        "New in-app feedback",
        "",
        `Category: ${categoryLabel}`,
        `From: ${user.email ?? "(no email)"} (user id: ${user.id})`,
        `Page: ${path}`,
        `Sent: ${new Date().toISOString()}`,
        "",
        "Message:",
        message,
      ].join("\n"),
    });

    if (sendError) {
      throw new Error(sendError.message || "Resend send failed");
    }
  } catch (err) {
    console.error("[feedback] send failed:", err);
    return NextResponse.json(
      { error: "Could not send your feedback right now. Please try again later." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
