// app/(auth-pages)/sign-up/page.tsx
//
// Technical explanation:
// Defines the client-side UI and logic for user registration. Manages form
// state (email, password) and uses `useTransition` for submission pending
// states. Calls `signUpAction` (server action) for registration. Displays a
// toast notification on success and links to the sign-in page.
//
// Analogy:
// A registration form for a new service. Users fill in details (email,
// password) to create an account. The form is submitted (like sending an
// application), and on success, provides next steps (email verification).

'use client';

import { useTransition, useState } from "react";
import { signUpAction } from "@/app/actions";
import { toast } from "sonner";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";
import { Moon, Sparkles, CheckCircle } from "lucide-react";

export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, startTransition] = useTransition();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData();
      formData.append('email', email);
      formData.append('password', password);

      const result = await signUpAction(formData);

      if ('error' in result) {
        toast.error(result.error);
      } else if ('success' in result) {
        toast.success("Check your email to verify your account.");
        setEmail('');
        setPassword('');
      }
    });
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4 px-4 py-2">
            <Sparkles className="w-4 h-4 mr-2" />
            Start Your Free Trial
          </Badge>
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
              Join DreamLink
            </span>
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Begin your spiritual dream interpretation journey
          </p>
        </div>
        
        <Card className="w-full shadow-lg border-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm mb-6">
          <CardHeader className="text-center pb-4">
            <Moon className="w-12 h-12 mx-auto mb-4 text-blue-600" />
            <CardTitle className="text-xl">Start Your Free Trial</CardTitle>
            <CardDescription>
              7 days free • No credit card required • Cancel anytime
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="flex-1 flex flex-col w-full space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  name="password"
                  type="password"
                  placeholder="Your password"
                  minLength={6}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <SubmitButton
                isLoading={pending}
                pendingText="Signing up..."
                className="w-full"
              >
                Sign up
              </SubmitButton>
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
            <SmtpMessage />
          </CardFooter>
        </Card>
        
        {/* Benefits reminder */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border-none">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-center">What you'll get:</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>AI-powered dream interpretations</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Biblical references and insights</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Private dream journal</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                <span>Pattern tracking and insights</span>
              </div>
            </div>
          </CardContent>
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