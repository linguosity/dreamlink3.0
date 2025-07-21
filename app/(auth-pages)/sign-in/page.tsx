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
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Moon, Sparkles } from "lucide-react";

export default async function Login(props: { searchParams: Promise<Message> }) {
  const searchParams = await props.searchParams;
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4 px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            Welcome Back
          </Badge>
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Sign in to DreamLink
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Continue your spiritual dream journey
          </p>
        </div>
        
        <Card className="w-full shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <Moon className="w-12 h-12 mx-auto mb-4 text-blue-600" />
            <CardTitle className="text-xl">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to access your dream journal and interpretations
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  Start your free trial
                </Link>
              </p>
              <p className="text-xs text-gray-500">
                Free 7-day trial • No credit card required
              </p>
            </div>
          </CardFooter>
        </Card>
        
        <div className="text-center mt-8">
          <Link href="/landing" className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
