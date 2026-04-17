// app/auth/callback/route.ts
//
// Technical explanation:
// API route handler for `/auth/callback`. Handles OAuth callbacks and email
// verification redirects. Exchanges an authorization `code` (from URL params)
// for a user session via `supabase.auth.exchangeCodeForSession(code)`.
// Redirects user to a specified path or homepage after session creation.
//
// Analogy:
// A secure checkpoint (customs desk) after visiting an external embassy (OAuth
// provider) for a visa (auth code). The visa is presented, verified, and an
// entry permit (session) is granted, then user is directed to their
// destination or main city square.

import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

/**
 * Whitelist of safe internal paths that `redirect_to` is allowed to point at.
 * Prevents open-redirect phishing: an attacker-supplied `redirect_to=//evil.com`
 * would otherwise resolve (via `${origin}${redirectTo}`) to `https://evil.com`
 * because browsers treat `//` as a protocol-relative URL.
 *
 * If you add a new post-login destination, add it here.
 */
const SAFE_REDIRECT_PATHS = new Set<string>([
  "/",
  "/onboarding",
  "/account",
  "/settings",
  "/protected",
  "/protected/reset-password",
]);

/**
 * Returns a safe same-origin path to redirect to, or "/" as a fallback.
 *
 * Rules:
 *  - Must start with exactly one `/` (rejects protocol-relative `//host` and
 *    absolute URLs like `http://host/...`).
 *  - Must not contain `://` anywhere.
 *  - Must appear in SAFE_REDIRECT_PATHS (compared by pathname, query/hash stripped).
 */
function safeRedirectPath(input: string | null | undefined): string {
  if (!input) return "/";
  if (!input.startsWith("/")) return "/";
  if (input.startsWith("//")) return "/";
  if (input.includes("://")) return "/";
  // Strip query/hash before whitelist comparison so e.g. `/account?tab=x` still matches `/account`.
  const pathnameOnly = input.split("?")[0].split("#")[0];
  return SAFE_REDIRECT_PATHS.has(pathnameOnly) ? input : "/";
}

export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the SSR package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/server-side/nextjs
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const redirectTo = requestUrl.searchParams.get("redirect_to")?.toString();

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  const target = safeRedirectPath(redirectTo);
  return NextResponse.redirect(`${origin}${target}`);
}
