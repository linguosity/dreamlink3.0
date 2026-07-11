// app/(auth-pages)/sign-in/page.tsx
//
// Technical explanation:
// Creates the UI for the sign-in page. Includes a form for email and
// password, a 'Forgot Password?' link, and a submit button triggering
// `signInAction`. Displays messages from search params and links to the
// sign-up page. Uses Card components for structure.
//
// Analogy:
// The main login screen of a secure application, like an online bank. Users
// provide credentials to access. Links are available for password recovery or
// new user registration.

import { signInAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import GoogleOAuthButton from "@/components/GoogleOAuthButton";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  
  return (
    // Above-the-fold budget: the auth layout already shows the wordmark,
    // tagline, and Sign In/Sign Up tabs — this page renders only the card.
    <div className="relative w-full">
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
            <CardTitle className="text-xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to access your dream journal and interpretations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <GoogleOAuthButton />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-slate-800 px-2 text-muted-foreground">
                  or continue with email
                </span>
              </div>
            </div>

            <form className="flex-1 flex flex-col w-full space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input name="email" id="email" placeholder="you@example.com" required />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    className="text-xs text-muted-foreground hover:text-foreground"
                    href="/forgot-password"
                    prefetch={true}
                  >
                    Forgot Password?
                  </Link>
                </div>
                <Input
                  type="password"
                  name="password"
                  id="password"
                  placeholder="Your password"
                  required
                />
              </div>

              <SubmitButton pendingText="Signing In..." formAction={signInAction} className="w-full">
                Sign in
              </SubmitButton>

              <FormMessage message={searchParams} />
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 border-t pt-4">
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link className="text-primary font-medium hover:underline" href="/sign-up" prefetch={true}>
                  Create your free journal
                </Link>
              </p>
              <p className="text-xs text-gray-500">
                3 free interpretations • No credit card required
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
