// lib/emails/templates.ts
//
// Plain-HTML lifecycle email templates. Pure functions — no I/O, no env
// reads except the shared support address — each returns { subject, html,
// text } so lib/emails/send.ts can hand both parts to Resend.
//
// Email-client constraints honored here:
//   - table-based layout, everything inline-styled (no <style> blocks),
//   - hex colors only (the app's oklch tokens don't exist in email land),
//   - no external images — the wordmark is text, so nothing breaks when a
//     client blocks remote content,
//   - a plain-text fallback per email for text-only clients + spam scoring.
//
// Palette mirrors the DreamRiver "Moonwater" tokens in app/globals.css
// (hex equivalents from the comments there): night #0E1A30, night-deep
// #08111F, night-soft #1A2748, cream/starlight #F5ECD6, gold #D4A247.

import { getSupportEmail } from "@/lib/resend";

export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}

// Hardcoded prod origin, same convention as lib/blog.ts SITE_URL — lifecycle
// emails must always point at the canonical domain, never a preview URL.
const SITE_URL = "https://dreamriver.io";

// Brand hex tokens (see header comment for the oklch sources).
const NIGHT = "#0E1A30";
const CARD = "#1A2748";
const CARD_BORDER = "#2A3A5F";
const STARLIGHT = "#F5ECD6";
const BODY_TEXT = "#C9D2E4";
const MUTED = "#8B96B3";
const GOLD = "#D4A247";
const GOLD_LIGHT = "#E6C073";

const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "Arial, Helvetica, sans-serif";

function heading(text: string): string {
  return `<h1 style="margin:0 0 18px 0; font-family:${SERIF}; font-size:22px; line-height:1.35; font-weight:normal; color:${STARLIGHT};">${text}</h1>`;
}

function para(text: string): string {
  return `<p style="margin:0 0 16px 0; font-family:${SANS}; font-size:15px; line-height:1.65; color:${BODY_TEXT};">${text}</p>`;
}

function mutedPara(text: string): string {
  return `<p style="margin:8px 0 0 0; font-family:${SANS}; font-size:13px; line-height:1.6; color:${MUTED};">${text}</p>`;
}

function ctaButton(label: string, href: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:26px auto 6px auto;">
  <tr>
    <td align="center" bgcolor="${GOLD}" style="border-radius:8px; background-color:${GOLD};">
      <a href="${href}" target="_blank" style="display:inline-block; padding:13px 32px; font-family:${SANS}; font-size:15px; font-weight:bold; color:${NIGHT}; text-decoration:none; border-radius:8px;">${label}</a>
    </td>
  </tr>
</table>`;
}

/**
 * Shared branded shell: hidden preheader, text wordmark, night-blue card,
 * starlight footer with the support address. `bodyHtml` renders inside the
 * card.
 *
 * Every footer carries a "Manage email preferences" link (/settings). For
 * recurring email (reminders, digest) callers also pass a tokenized
 * `unsubscribeUrl` (lib/emails/unsubscribe.ts) so one click opts out without
 * logging in; when it's null (CRON_SECRET unset) the link is simply omitted.
 */
function wrap(
  preheader: string,
  bodyHtml: string,
  opts?: { unsubscribeUrl?: string | null },
): string {
  const support = getSupportEmail();
  const unsubscribeHtml = opts?.unsubscribeUrl
    ? ` &middot; <a href="${opts.unsubscribeUrl}" style="color:${MUTED}; text-decoration:underline;">Unsubscribe</a>`
    : "";
  return `<div style="display:none; max-height:0px; overflow:hidden; mso-hide:all;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${NIGHT}" style="margin:0; padding:0; background-color:${NIGHT};">
  <tr>
    <td align="center" style="padding:36px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px; max-width:100%;">
        <tr>
          <td align="center" style="padding:0 0 22px 0; font-family:${SERIF}; font-size:24px; letter-spacing:1px; color:${STARLIGHT};">
            <span style="color:${GOLD};">&#10022;</span>&nbsp;DreamRiver
          </td>
        </tr>
        <tr>
          <td bgcolor="${CARD}" style="background-color:${CARD}; border:1px solid ${CARD_BORDER}; border-radius:12px; padding:36px 32px;">
            ${bodyHtml}
          </td>
        </tr>
        <tr>
          <td align="center" style="padding:24px 8px 0 8px; font-family:${SANS}; font-size:12px; line-height:1.7; color:${MUTED};">
            Questions? Just reply, or write to <a href="mailto:${support}" style="color:${GOLD_LIGHT}; text-decoration:underline;">${support}</a>.<br/>
            You're receiving this because you have a DreamRiver account.<br/>
            <a href="${SITE_URL}/settings" style="color:${MUTED}; text-decoration:underline;">Manage email preferences</a>${unsubscribeHtml}<br/>
            DreamRiver &middot; <a href="${SITE_URL}" style="color:${MUTED}; text-decoration:underline;">dreamriver.io</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

/** Shared plain-text footer appended to every text fallback. */
function textFooter(opts?: { unsubscribeUrl?: string | null }): string {
  const unsubscribeLine = opts?.unsubscribeUrl
    ? `\nUnsubscribe: ${opts.unsubscribeUrl}`
    : "";
  return `\n\n—\nQuestions? Just reply, or write to ${getSupportEmail()}.\nYou're receiving this because you have a DreamRiver account.\nManage email preferences: ${SITE_URL}/settings${unsubscribeLine}\nDreamRiver · ${SITE_URL}`;
}

/** Escape user-provided text (dream titles) before interpolating into HTML. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Deterministic long-form date ("August 3, 2026") for access-until copy. */
function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

/* ────────────────────────────────────────────────────────────────────────
 * 1. Welcome — sent once at first authenticated arrival.
 * ──────────────────────────────────────────────────────────────────────── */
export function welcomeEmail(): EmailContent {
  const subject = "Your first dream is waiting";
  const preheader =
    "3 free interpretations are on your account. Tonight: keep a journal by your bed.";
  const cta = `${SITE_URL}/`;

  const html = wrap(
    preheader,
    [
      heading("Welcome to DreamRiver"),
      para(
        "We're so glad you're here. DreamRiver is a quiet place to write down your dreams and seek out what they might mean, with Scripture as the lamp. Your account starts with 3 free dream interpretations — no card, no catch.",
      ),
      para(
        "Here's the whole secret for tonight: <strong style=\"color:" +
          STARLIGHT +
          "\">keep your phone or a notebook beside your bed</strong>. Dreams fade within minutes of waking, so capture even a few words the moment you open your eyes — DreamRiver will help you unfold the rest in the morning.",
      ),
      ctaButton("Open your journal", cta),
      mutedPara(
        "In the morning, write down whatever you remember — your first interpretation is waiting.",
      ),
    ].join("\n"),
  );

  const text = `Welcome to DreamRiver

We're so glad you're here. DreamRiver is a quiet place to write down your dreams and seek out what they might mean, with Scripture as the lamp. Your account starts with 3 free dream interpretations — no card, no catch.

Here's the whole secret for tonight: keep your phone or a notebook beside your bed. Dreams fade within minutes of waking, so capture even a few words the moment you open your eyes — DreamRiver will help you unfold the rest in the morning.

Open your journal: ${cta}${textFooter()}`;

  return { subject, html, text };
}

/* ────────────────────────────────────────────────────────────────────────
 * 2. Credits exhausted — sent once ever (free credits are lifetime).
 * ──────────────────────────────────────────────────────────────────────── */
export function creditsExhaustedEmail(): EmailContent {
  const subject = "You've used your 3 free interpretations";
  const preheader = "Your journal stays yours — free, forever.";
  const cta = `${SITE_URL}/pricing?utm_source=email&utm_medium=lifecycle&utm_campaign=credits_exhausted`;

  const html = wrap(
    preheader,
    [
      heading("Three dreams, interpreted"),
      para(
        "You've used all 3 of your free dream interpretations. We hope each one brought a little more light.",
      ),
      para(
        "First, the part that matters most: <strong style=\"color:" +
          STARLIGHT +
          "\">your journal is yours, forever</strong>. Every dream you've written and every interpretation you've received stays free and available for as long as you keep your account.",
      ),
      para(
        "If DreamRiver has been meaningful, the Visionary plan continues the journey with 50 interpretations each month and deeper analysis of every dream.",
      ),
      ctaButton("See plans", cta),
      mutedPara("No pressure either way — thank you for dreaming with us."),
    ].join("\n"),
  );

  const text = `Three dreams, interpreted

You've used all 3 of your free dream interpretations. We hope each one brought a little more light.

First, the part that matters most: your journal is yours, forever. Every dream you've written and every interpretation you've received stays free and available for as long as you keep your account.

If DreamRiver has been meaningful, the Visionary plan continues the journey with 50 interpretations each month and deeper analysis of every dream.

See plans: ${cta}

No pressure either way — thank you for dreaming with us.${textFooter()}`;

  return { subject, html, text };
}

/* ────────────────────────────────────────────────────────────────────────
 * 3. Payment failed — sent once per failed invoice (not per retry attempt).
 * ──────────────────────────────────────────────────────────────────────── */
export function paymentFailedEmail(): EmailContent {
  const subject = "Your DreamRiver payment didn't go through";
  const preheader = "Nothing is lost — your access continues while we retry.";
  // The Stripe billing portal needs a server-created session (POST
  // /api/stripe/portal), so an email can't deep-link into it. /settings hosts
  // the "Manage billing" button that opens the portal (plan-section.tsx).
  const cta = `${SITE_URL}/settings`;

  const html = wrap(
    preheader,
    [
      heading("A small hiccup with your payment"),
      para(
        "We tried to process the payment for your DreamRiver subscription, but your card didn't go through. This is usually something simple — a card that expired or was recently replaced.",
      ),
      para(
        "There's nothing to worry about: <strong style=\"color:" +
          STARLIGHT +
          "\">your access continues as normal</strong>, and we'll retry the payment automatically over the next few days.",
      ),
      para("To sort it out now, it only takes a minute:"),
      ctaButton("Update payment method", cta),
      mutedPara(
        "In Settings, choose “Manage billing” to update your card securely with Stripe. Already updated it? You can safely ignore this email.",
      ),
    ].join("\n"),
  );

  const text = `A small hiccup with your payment

We tried to process the payment for your DreamRiver subscription, but your card didn't go through. This is usually something simple — a card that expired or was recently replaced.

There's nothing to worry about: your access continues as normal, and we'll retry the payment automatically over the next few days.

Update your payment method (Settings → Manage billing): ${cta}

Already updated it? You can safely ignore this email.${textFooter()}`;

  return { subject, html, text };
}

/* ────────────────────────────────────────────────────────────────────────
 * 4. Cancellation confirmed — sent once per subscription period when a
 *    cancellation is scheduled (cancel_at_period_end).
 * ──────────────────────────────────────────────────────────────────────── */
export function cancellationConfirmedEmail(params: {
  /** When paid access ends; null when Stripe didn't give us a usable date. */
  accessUntil: Date | null;
}): EmailContent {
  const subject = "Your DreamRiver subscription is canceled";
  const accessLine = params.accessUntil
    ? `You'll keep full access to everything in your plan until <strong style="color:${STARLIGHT}">${formatDate(params.accessUntil)}</strong>. After that, your account simply moves to the free plan.`
    : "You'll keep full access to everything in your plan through the end of your current billing period. After that, your account simply moves to the free plan.";
  const accessLineText = params.accessUntil
    ? `You'll keep full access to everything in your plan until ${formatDate(params.accessUntil)}. After that, your account simply moves to the free plan.`
    : "You'll keep full access to everything in your plan through the end of your current billing period. After that, your account simply moves to the free plan.";
  const preheader = "No further charges. Your journal stays free, forever.";
  const cta = `${SITE_URL}/`;

  const html = wrap(
    preheader,
    [
      heading("Cancellation confirmed"),
      para(
        "This confirms that your DreamRiver subscription has been canceled and you won't be charged again.",
      ),
      para(accessLine),
      para(
        "And one thing that never changes: your journal stays yours, free, forever — every dream and interpretation will be right where you left it. If you ever want to pick the journey back up, you can resubscribe anytime from Settings.",
      ),
      ctaButton("Open your journal", cta),
    ].join("\n"),
  );

  const text = `Cancellation confirmed

This confirms that your DreamRiver subscription has been canceled and you won't be charged again.

${accessLineText}

And one thing that never changes: your journal stays yours, free, forever — every dream and interpretation will be right where you left it. If you ever want to pick the journey back up, you can resubscribe anytime from Settings.

Open your journal: ${cta}${textFooter()}`;

  return { subject, html, text };
}

/* ────────────────────────────────────────────────────────────────────────
 * 5. Morning reminder — recurring (hourly cron, at most once per day per
 *    user). Deliberately tiny: one question, one line, one button.
 * ──────────────────────────────────────────────────────────────────────── */
export function morningReminderEmail(params: {
  /** Tokenized one-click opt-out; null omits the link (CRON_SECRET unset). */
  unsubscribeUrl: string | null;
}): EmailContent {
  const subject = "What did you dream last night?";
  const preheader = "Even a fragment is enough — write it down before it fades.";
  const cta = `${SITE_URL}/?utm_source=email&utm_medium=lifecycle&utm_campaign=morning_reminder`;
  const footerOpts = { unsubscribeUrl: params.unsubscribeUrl };

  const html = wrap(
    preheader,
    [
      heading("What did you dream last night?"),
      para(
        "Even a fragment is enough — write it down before it fades, and see what it might mean.",
      ),
      ctaButton("Write it down", cta),
    ].join("\n"),
    footerOpts,
  );

  const text = `What did you dream last night?

Even a fragment is enough — write it down before it fades, and see what it might mean.

Write it down: ${cta}${textFooter(footerOpts)}`;

  return { subject, html, text };
}

/* ────────────────────────────────────────────────────────────────────────
 * 6. Weekly digest — recurring (Sunday cron, once per ISO week), only for
 *    users with ≥1 dream that week. PRIVACY: dream titles and dates ONLY —
 *    never dream content, summaries, or interpretations. Titles are
 *    user-provided text and get HTML-escaped.
 * ──────────────────────────────────────────────────────────────────────── */
export interface DigestDream {
  title: string | null;
  createdAt: Date;
}

export function weeklyDigestEmail(params: {
  /** Dreams recorded in the 7-day window (≥1 — zero-dream users are skipped). */
  dreamCount: number;
  /** Up to 3, newest first. Titles only. */
  recentDreams: DigestDream[];
  /** Free plan with lifetime credits used up → gentle /pricing pointer. */
  creditsExhausted: boolean;
  /** Tokenized one-click opt-out; null omits the link (CRON_SECRET unset). */
  unsubscribeUrl: string | null;
}): EmailContent {
  const { dreamCount, recentDreams, creditsExhausted, unsubscribeUrl } = params;
  const noun = dreamCount === 1 ? "dream" : "dreams";
  const subject = `You wrote down ${dreamCount} ${noun} this week`;
  const preheader = "A quiet look back at your week on the river.";
  const cta = `${SITE_URL}/?utm_source=email&utm_medium=lifecycle&utm_campaign=weekly_digest`;
  const pricingUrl = `${SITE_URL}/pricing?utm_source=email&utm_medium=lifecycle&utm_campaign=weekly_digest`;
  const footerOpts = { unsubscribeUrl };

  const shortDate = (d: Date): string =>
    d.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" });
  const displayTitle = (title: string | null): string => {
    const trimmed = (title ?? "").trim();
    const capped = trimmed.length > 80 ? `${trimmed.slice(0, 79)}…` : trimmed;
    return capped || "Untitled dream";
  };
  const moreCount = Math.max(0, dreamCount - recentDreams.length);

  const listHtml = recentDreams
    .map(
      (d) =>
        `<p style="margin:0 0 10px 0; font-family:${SANS}; font-size:15px; line-height:1.5;"><span style="color:${STARLIGHT};">${escapeHtml(displayTitle(d.title))}</span><span style="color:${MUTED};">&nbsp;&middot;&nbsp;${shortDate(d.createdAt)}</span></p>`,
    )
    .join("\n");

  const html = wrap(
    preheader,
    [
      heading("Your week on the river"),
      para(
        `You wrote down <strong style="color:${STARLIGHT}">${dreamCount} ${noun}</strong> this week:`,
      ),
      listHtml,
      moreCount > 0
        ? mutedPara(`…and ${moreCount} more in your journal.`)
        : "",
      creditsExhausted
        ? para(
            `One gentle note: you've used your 3 free interpretations, so new dreams aren't being interpreted right now. If the journey has been meaningful, <a href="${pricingUrl}" style="color:${GOLD_LIGHT}; text-decoration:underline;">the Visionary plan</a> continues it — and your journal stays free either way.`,
          )
        : "",
      ctaButton("Open your journal", cta),
      mutedPara(
        "Only your dream titles appear in this email — the dreams themselves stay private in your journal.",
      ),
    ]
      .filter(Boolean)
      .join("\n"),
    footerOpts,
  );

  const listText = recentDreams
    .map((d) => `- ${displayTitle(d.title)} · ${shortDate(d.createdAt)}`)
    .join("\n");
  const creditsText = creditsExhausted
    ? `\n\nOne gentle note: you've used your 3 free interpretations, so new dreams aren't being interpreted right now. If the journey has been meaningful, the Visionary plan continues it — and your journal stays free either way: ${pricingUrl}`
    : "";

  const text = `Your week on the river

You wrote down ${dreamCount} ${noun} this week:

${listText}${moreCount > 0 ? `\n…and ${moreCount} more in your journal.` : ""}${creditsText}

Open your journal: ${cta}

Only your dream titles appear in this email — the dreams themselves stay private in your journal.${textFooter(footerOpts)}`;

  return { subject, html, text };
}
