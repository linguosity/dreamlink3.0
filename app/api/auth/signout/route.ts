// app/api/auth/signout/route.ts
//
// Technical explanation:
// API route for user sign-out. On GET request, calls
// `supabase.auth.signOut()` to clear the session and auth cookies. Redirects
// to a whitelisted `redirect_to` query param destination or defaults to
// `/sign-in`.
//
// Security (2026-06-09 release audit, H6): `redirect_to` used to be passed
// raw into `new URL(input, origin)`, where absolute and protocol-relative
// inputs override the base — an open redirect usable for phishing
// (sign the user out, land them on a fake login page). Destinations are now
// validated against a whitelist, mirroring app/auth/callback/route.ts.

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const SAFE_REDIRECT_PATHS = new Set<string>([
  "/",
  "/sign-in",
  "/landing",
  "/coming-soon",
]);

function safeRedirectPath(input: string | null | undefined): string {
  if (!input) return "/sign-in";
  if (!input.startsWith("/")) return "/sign-in";
  if (input.startsWith("//")) return "/sign-in";
  if (input.includes("://")) return "/sign-in";
  const pathnameOnly = input.split("?")[0].split("#")[0];
  return SAFE_REDIRECT_PATHS.has(pathnameOnly) ? input : "/sign-in";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  // clears the sb-… cookies
  await supabase.auth.signOut();

  const { origin, searchParams } = new URL(request.url);
  const nextLocation = safeRedirectPath(searchParams.get("redirect_to"));

  return NextResponse.redirect(new URL(nextLocation, origin));
}
