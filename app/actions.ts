"use server";

import { createClient } from "@/utils/supabase/server";
import { getAdminClient } from "@/utils/supabase/admin";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { encodedRedirect } from "@/utils/utils";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { signUpSchema, signInSchema, forgotPasswordSchema, resetPasswordSchema } from "@/schema/auth";
import { getComingSoonEnabled, isAllowedAdminEmail } from "@/lib/siteSettings";

// --- Sign Up ---
export const signUpAction = async (formData: FormData) => {
  try {
    // Validate with Zod
    const parsed = signUpSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      // Return the first validation error
      const firstError = parsed.error.errors[0]?.message || "Invalid input";
      return { error: firstError };
    }

    const { email, password } = parsed.data;

    // Coming-soon gate: block public sign-ups during pre-launch unless the
    // email is on the admin allowlist (the dev's brother, etc.). The flag
    // flips on/off via the admin UI; allowlist comes from
    // ADMIN_EMAIL_ALLOWLIST env var.
    if (await getComingSoonEnabled()) {
      if (!isAllowedAdminEmail(email)) {
        return {
          error:
            "DreamRiver isn't open to new accounts yet. Join the waitlist on dreamriver.io and we'll let you know when we launch.",
        };
      }
    }

    const supabase = await createClient();

    let origin;
    try {
      const headersList = await headers();
      origin = headersList.get("origin") || "http://localhost:3000";
    } catch {
      origin = "http://localhost:3000";
    }

    // in action.ts ↓
  const { data: signUpData, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // instead of `origin`, point at your callback + target page:
      emailRedirectTo: `${origin}/auth/callback?redirect_to=/`,
    },
  });

    if (error) {
      console.error(error.code + " " + error.message);
      return { error: error.message };
    }

    // The base profile row is created by the on_auth_user_created trigger
    // (see migration 20260308000001). For allowlisted emails (e.g. the dev's
    // brother) we additionally promote them to admin so they bypass the
    // coming-soon gate without manual SQL.
    //
    // We MUST use the admin client here: at this point the auth cookie hasn't
    // been written back to the browser yet, so the session-bound `supabase`
    // client has no authenticated user — and profile RLS blocks anonymous
    // updates. The service role bypasses RLS by design.
    if (signUpData?.user && isAllowedAdminEmail(email)) {
      // Cast: getAdminClient() isn't schema-typed (no generated Database type
      // in the repo), so .update() resolves to `never`. Same workaround as
      // the Stripe webhook admin writes.
      const { error: profileError } = await (getAdminClient().from("profile") as any)
        .update({ is_admin: true })
        .eq("user_id", signUpData.user.id);
      if (profileError) {
        console.error("Failed to mark allowlisted user as admin:", profileError.message);
        // Non-fatal — the user is still signed up; an admin can flip the flag
        // manually in Supabase if this ever fails.
      }
    }

    return { success: "Thanks for signing up! Check your email for a verification link." };
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("Unexpected error during sign up:", error);
    return { error: "An unexpected error occurred. Please try again." };
  }
};

// --- Sign In ---
export const signInAction = async (formData: FormData) => {
  try {
    const parsed = signInSchema.safeParse({
      email: formData.get("email"),
      password: formData.get("password"),
    });

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Invalid input";
      redirect(`/sign-in?error=${encodeURIComponent(firstError)}`);
    }

    const { email, password } = parsed.data;

    const supabase = await createClient();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Sign-in error:", error.message);
      redirect(`/sign-in?error=${encodeURIComponent(error.message)}`);
    }

    if (!data?.session) {
      console.error("No session after login");
      redirect(
        "/sign-in?error=Authentication succeeded but no session was created. Please try again."
      );
    }

    // Coming-soon gate: even if Supabase auth succeeded, only admins should
    // hold a session during pre-launch. We check (allowlist OR is_admin)
    // and tear down the session if neither matches.
    if (await getComingSoonEnabled()) {
      const userEmail = data.user?.email ?? null;
      let bypass = isAllowedAdminEmail(userEmail);
      if (!bypass && data.user) {
        const { data: profile } = await supabase
          .from("profile")
          .select("is_admin")
          .eq("user_id", data.user.id)
          .single();
        bypass = Boolean((profile as { is_admin?: boolean } | null)?.is_admin);
      }
      if (!bypass) {
        await supabase.auth.signOut();
        redirect(
          `/sign-in?error=${encodeURIComponent(
            "DreamRiver isn't open yet — only invited admins can sign in during pre-launch.",
          )}`,
        );
      }
    }

    // Small delay for cookie processing
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/", "layout");
    } catch {
      console.log("Revalidation step skipped (ok in production)");
    }

    redirect("/");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("Unexpected error during sign in:", error);
    redirect("/sign-in?error=An unexpected error occurred. Please try again.");
  }
};

// --- Forgot Password ---
export const forgotPasswordAction = async (formData: FormData) => {
  try {
    const parsed = forgotPasswordSchema.safeParse({
      email: formData.get("email"),
    });

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Invalid input";
      redirect(`/forgot-password?error=${encodeURIComponent(firstError)}`);
    }

    const { email } = parsed.data;

    const supabase = await createClient();
    const headersList = await headers();
    const origin = headersList.get("origin") || "http://localhost:3000";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
    });

    if (error) {
      console.error(error.message);
      redirect("/forgot-password?error=Could not reset password");
    }

    redirect(
      `/forgot-password?success=${encodeURIComponent(
        "Check your email for a link to reset your password."
      )}`
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("Unexpected error during forgot password:", error);
    redirect(
      "/forgot-password?error=An unexpected error occurred. Please try again."
    );
  }
};

// --- Reset Password ---
export const resetPasswordAction = async (formData: FormData) => {
  try {
    const parsed = resetPasswordSchema.safeParse({
      password: formData.get("password"),
      confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
      const firstError = parsed.error.errors[0]?.message || "Invalid input";
      redirect(
        `/protected/reset-password?error=${encodeURIComponent(firstError)}`
      );
    }

    const { password } = parsed.data;

    const supabase = await createClient();

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      console.error(error.message);
      redirect("/protected/reset-password?error=Password update failed");
    }

    redirect(
      `/protected/reset-password?success=${encodeURIComponent(
        "Password updated successfully."
      )}`
    );
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("Unexpected error during reset password:", error);
    redirect(
      "/protected/reset-password?error=An unexpected error occurred. Please try again."
    );
  }
};

// --- Sign Out ---
export const signOutAction = async () => {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();

    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/", "layout");
    } catch {
      console.log("Revalidation skipped (ok in production)");
    }

    redirect("/sign-in");
  } catch (error) {
    if (isRedirectError(error)) {
      throw error;
    }
    console.error("Unexpected error during sign out:", error);
    redirect("/sign-in?error=An unexpected error occurred during sign out.");
  }
};
