import { permanentRedirect } from "next/navigation";

/**
 * `/protected/reset-password` moved to `/reset-password` (HANDOFF-v3.md §6 —
 * reset-password is an auth-flow page, grouped with sign-in/sign-up/
 * forgot-password, not a `/protected` dashboard route). Permanent (308)
 * redirect keeps already-sent password-reset emails and old bookmarks
 * working — see app/auth/callback/route.ts's SAFE_REDIRECT_PATHS, which
 * still recognizes this path for exactly that reason.
 */
export default function ResetPasswordRedirect() {
  permanentRedirect("/reset-password");
}
