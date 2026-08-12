// app/(app)/layout.tsx
//
// The signed-in app shell: navbar, feedback bubble, and the main-content
// wrapper the skip link points at. Everything under this route group gets it;
// nothing outside the group can.
//
// The session read that used to live in the root layout lives here instead.
// The root layout is shared by every route, so doing it there made /admin and
// the sign-in lobby pay for a Supabase round trip and a profile query they had
// no use for — and left the root layout dynamic, which no static page wants.

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { createClient } from "@/utils/supabase/server";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { EnvVarWarning } from "@/components/env-var-warning";
import Navbar from "@/components/Navbar";
import FeedbackWidget from "@/components/FeedbackWidget";
import { HintsProvider } from "@/lib/hints/dismissed-context";
import { HINT_IDS, type HintId } from "@/lib/hints/types";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let user = null;
  let dismissedHints: HintId[] = [];

  try {
    const supabase = await createClient();
    const { data, error: userError } = await supabase.auth.getUser();

    if (userError) {
      if (userError.message.includes("User from sub claim")) {
        // kick into our sign-out handler, with a message
        const msg = encodeURIComponent("Session expired. Please sign in again.");
        redirect(`/api/auth/signout?redirect_to=/sign-in?error=${msg}`);
      }
      else if (userError.message !== "Auth session missing!") {
        console.error("Error fetching user:", userError.message);
      }
    } else if (data.user) {
      user = data.user;
      const { data: profileRow } = await supabase
        .from("profile")
        .select("dismissed_hints")
        .eq("user_id", user.id)
        .single();
      const raw = (profileRow?.dismissed_hints as string[] | null) ?? [];
      dismissedHints = raw.filter((id): id is HintId =>
        (HINT_IDS as readonly string[]).includes(id),
      );
    }
  } catch (err: unknown) {
    // re-throw Next.js redirects so they become real HTTP 3xxs
    if (isRedirectError(err)) throw err;
    // …and Next's "this route is dynamic" signal. `next build` tries to
    // prerender every page; cookies() throws DYNAMIC_SERVER_USAGE to say it
    // can't. Catching that printed a stack trace for every route in this group
    // on every build, and swallowed the signal Next raised it to send.
    if (
      typeof err === "object" &&
      err !== null &&
      (err as { digest?: string }).digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw err;
    }
    console.error("Unexpected auth error in layout:", err);
  }

  return (
    <HintsProvider initialDismissed={dismissedHints}>
      <main className="min-h-screen flex flex-col animate-fade-in">
        {/* Env-var warning or Navbar. No pathname check: routes that must not
            show the navbar are not in this group in the first place. */}
        {!hasEnvVars ? (
          <div className="w-full flex justify-center border-b h-16">
            <div className="w-full max-w-5xl flex justify-between items-center p-3 text-sm">
              <EnvVarWarning />
            </div>
          </div>
        ) : user ? (
          <Navbar />
        ) : null}

        {/* Main content */}
        <div
          id="main-content"
          className={`flex-1 ` + (!user ? "flex items-center justify-center" : "")}
        >
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </div>

        {/* Floating feedback bubble — signed-in users only. The widget still
            gates itself by pathname, because this group also holds the public
            marketing and legal pages (blog, about, terms, …) where it would
            be noise. */}
        {user && <FeedbackWidget />}
      </main>
    </HintsProvider>
  );
}
