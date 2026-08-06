// app/(auth-pages)/reset-password/page.tsx
//
// Moved from app/protected/reset-password/ (HANDOFF-v3.md §6 / PL D): this
// is conceptually an auth-flow page (like sign-in/sign-up/forgot-password),
// not a dashboard route, so it belongs in the (auth-pages) group and at a
// bare `/reset-password` URL rather than nested under `/protected`.
//
// This page still requires a session — clicking the emailed reset link
// establishes a temporary Supabase "recovery" session via /auth/callback
// before landing here, and resetPasswordAction (app/actions.ts) needs that
// session to call supabase.auth.updateUser(). See the "skip the
// authenticated-redirect for /reset-password" carve-out in
// app/(auth-pages)/layout.tsx — without it, the shared auth layout would
// bounce a legitimately-recovering user straight back to "/" before they
// could ever see this form.
//
// The old app/protected/reset-password/ path now redirects here (see that
// file) so already-sent reset emails and bookmarks keep working.

import { resetPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ResetPassword(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  return (
    <form className="flex flex-col w-full max-w-md p-4 gap-2 [&>input]:mb-4">
      <h1 className="text-2xl font-medium">Reset password</h1>
      <p className="text-sm text-foreground/60">
        Please enter your new password below.
      </p>
      <Label htmlFor="password">New password</Label>
      <Input
        id="password"
        type="password"
        name="password"
        autoComplete="new-password"
        placeholder="New password"
        minLength={8}
        required
      />
      <Label htmlFor="confirmPassword">Confirm password</Label>
      <Input
        id="confirmPassword"
        type="password"
        name="confirmPassword"
        autoComplete="new-password"
        placeholder="Confirm password"
        minLength={8}
        required
      />
      <SubmitButton formAction={resetPasswordAction}>
        Reset password
      </SubmitButton>
      <FormMessage message={searchParams} />
    </form>
  );
}
