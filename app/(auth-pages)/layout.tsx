import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { FormMessage, Message } from "@/components/form-message";
import { isRedirectError } from "next/dist/client/components/redirect-error";

export default async function AuthLayout({
  children,
  searchParams,
}: {
  children: ReactNode;
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  try {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // If already logged in, send them home—preserve any ?success=… query
    if (session) {
      const params = searchParams ? new URLSearchParams(
        Object.entries(searchParams)
          .filter(([_, value]) => value !== undefined)
          .map(([key, value]) => [key, value!.toString()])
      ).toString() : "";
      
      return redirect(params ? `/?${params}` : "/");
    }
  } catch (err) {
    // Re-throw Next.js redirects
    if (isRedirectError(err)) throw err;
    console.error("Auth check error:", err);
  }

  // Construct message object for FormMessage
  const message: Partial<Message> = {};
  if (searchParams?.error) {
    message.error = Array.isArray(searchParams.error) 
      ? searchParams.error[0] 
      : searchParams.error;
  } else if (searchParams?.success) {
    message.success = Array.isArray(searchParams.success)
      ? searchParams.success[0]
      : searchParams.success;
  }

  // Otherwise render the normal auth UI
  return (
    <div className="flex items-center justify-center min-h-screen w-full">
      <div className="flex flex-col items-center max-w-md w-full mx-auto px-5">
        <div className="mb-8">
          <h1 className="font-blanka text-4xl tracking-wider">Dreamlink</h1>
        </div>
        
        {(message.error || message.success) && (
          <div className="w-full mb-4">
            <FormMessage message={message as Message} />
          </div>
        )}
        
        {children}
      </div>
    </div>
  );
}
