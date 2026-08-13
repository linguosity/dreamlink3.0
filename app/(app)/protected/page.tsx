import { redirect } from "next/navigation";

/**
 * `/protected` is the namespace for auth-required dashboard routes. It used
 * to also hold `/protected/reset-password`, which moved to `/reset-password`
 * (HANDOFF-v3.md §6) — that path is now just a redirect shim for old links.
 * The root of this namespace has no dedicated page — the real authenticated
 * dashboard lives at `/`. Any direct visit to `/protected` bounces there.
 *
 * This replaces the Supabase starter-template boilerplate that used to render
 * `JSON.stringify(user, null, 2)` to the screen.
 */
export default function ProtectedIndex() {
  redirect("/");
}
