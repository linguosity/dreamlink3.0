import { createClient } from "@/utils/supabase/client";

type ErrorType =
  | "dream_submission"
  | "auth"
  | "image_generation"
  | "dream_delete"
  | "dream_star"
  | "network"
  | "unknown";

interface ErrorContext {
  route?: string;
  statusCode?: number;
  dreamText?: string;
  retryCount?: number;
  [key: string]: unknown;
}

/**
 * Logs a client-side error to the Supabase `client_error_logs` table.
 * Fires and forgets — never throws, so it won't interfere with user flow.
 */
export async function logClientError(
  errorType: ErrorType,
  errorMessage: string,
  context: ErrorContext = {}
) {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return; // Can't log without a user

    await supabase.from("client_error_logs").insert({
      user_id: user.id,
      error_type: errorType,
      error_message: errorMessage.slice(0, 1000), // cap length
      error_context: {
        ...context,
        // Strip dream text to first 100 chars for privacy
        dreamText: context.dreamText?.slice(0, 100),
        timestamp: new Date().toISOString(),
        url: typeof window !== "undefined" ? window.location.href : undefined,
      },
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    });
  } catch {
    // Silently fail — error logging should never break the app
    console.warn("Failed to log client error to Supabase");
  }
}
