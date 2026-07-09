// app/(auth-pages)/sign-up/page.tsx
//
// React 19 modernization: uses useActionState for form state management,
// replacing the previous useTransition + manual state pattern.

'use client';

import { useActionState, useEffect } from "react";
import { signUpAction } from "@/app/actions";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import GoogleOAuthButton from "@/components/GoogleOAuthButton";

// Action state shape returned by signUpAction
type SignUpState = {
  error?: string;
  success?: string;
} | null;

export default function Signup() {
  const [state, formAction, pending] = useActionState<SignUpState, FormData>(
    async (_prevState, formData) => {
      return await signUpAction(formData);
    },
    null
  );

  // Show toast notifications when state changes
  useEffect(() => {
    if (state?.error) {
      toast.error(state.error);
    } else if (state?.success) {
      toast.success("Check your email to verify your account.");
    }
  }, [state]);

  // Show inline error below the form
  const errorMessage = state?.error;

  return (
    // Above-the-fold budget: the auth layout already shows the wordmark,
    // tagline, and Sign In/Sign Up tabs — so this page renders ONLY the card.
    // (Previously: a second min-h-screen wrapper + badge + h1 + brand icon
    // pushed the submit button below the fold even on desktop.)
    <div className="relative w-full">
      {/* Full-viewport gradient + moon-glow, per hi-fi-signup; fixed so it
          doesn't add layout height. Sits above the layout's -z-[5] overlay. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-[4] bg-[linear-gradient(165deg,var(--cream-soft)_0%,oklch(0.93_0.025_230)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-[8%] left-1/2 -translate-x-1/2 -z-[3] w-[360px] h-[220px] rounded-full
                   bg-[radial-gradient(ellipse,oklch(0.85_0.06_75/0.5)_0%,transparent_60%)]"
      />
      <div className="relative w-full">
        <Card className="w-full shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-xl">Create Your Free Journal</CardTitle>
            <CardDescription>
              3 free dream interpretations &bull; No credit card required
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleOAuthButton />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-slate-800 px-2 text-muted-foreground">
                  or sign up with email
                </span>
              </div>
            </div>

            <form className="flex-1 flex flex-col w-full space-y-4" action={formAction}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Your password"
                  minLength={8}
                  required
                />
              </div>

              <SubmitButton
                isLoading={pending}
                pendingText="Signing up..."
                className="w-full"
              >
                Sign up
              </SubmitButton>

              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-950/20 p-3 text-sm text-red-600 dark:text-red-400">
                  {errorMessage}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                Password must be at least 8 characters with an uppercase letter, lowercase letter, and number or special character.
              </p>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 border-t pt-4">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link className="text-primary font-medium hover:underline" href="/sign-in">
                  Sign in
                </Link>
              </p>
            </div>
          </CardFooter>
        </Card>

        <div className="text-center mt-5">
          <Link href="/landing" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
