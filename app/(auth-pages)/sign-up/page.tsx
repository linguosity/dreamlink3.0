import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";

export default async function Signup(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  if ("message" in searchParams) {
    return (
      <Card className="w-full">
        <CardContent className="py-6">
          <FormMessage message={searchParams} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          Join Dreamlink to start recording and analyzing your dreams
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex-1 flex flex-col w-full space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              name="email"
              type="email"
              placeholder="you@example.com"
              required
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
            />
          </div>
          
          <SubmitButton 
            formAction={signUpAction} 
            pendingText="Signing up..." 
            className="w-full"
          >
            Sign up
          </SubmitButton>
          
          <FormMessage message={searchParams} />
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4 border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link className="text-primary font-medium hover:underline" href="/sign-in">
            Sign in
          </Link>
        </p>
        <SmtpMessage />
      </CardFooter>
    </Card>
  );
}
