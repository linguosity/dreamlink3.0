import { redirect } from "next/navigation";

/**
 * `/protected` is the namespace for auth-required routes (e.g. `/protected/reset-password`).
 * The root of that namespace has no dedicated page — the real authenticated dashboard
 * lives at `/`. Any direct visit to `/protected` bounces there.
 *
 * This replaces the Supabase starter-template boilerplate that used to render
 * `JSON.stringify(user, null, 2)` to the screen.
 */
export default function ProtectedIndex() {
  redirect("/");
}
