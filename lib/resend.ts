// lib/resend.ts
//
// Server-only Resend client. The API key is read from RESEND_API_KEY (set in
// .env) — never hardcode it, and never import this into a client component or
// anything that ships to the browser, or the key would leak.

import { Resend } from "resend";

let client: Resend | null = null;

/** Lazily construct the Resend client; throws a clear error if the key is unset. */
export function getResend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to your environment (.env / Vercel).",
    );
  }
  if (!client) client = new Resend(key);
  return client;
}
