"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const signUpAction = async (formData: FormData) => {
  try {
    const email = formData.get("email")?.toString();
    const password = formData.get("password")?.toString();
    
    if (!email || !password) {
      return encodedRedirect(
        "error",
        "/sign-up",
        "Email and password are required",
      );
    }
    
    const supabase = await createClient();
    
    // Get origin for redirect URL
    let origin;
    try {
      const headersList = headers();
      origin = headersList.get("origin") || "http://localhost:3000";
    } catch {
      origin = "http://localhost:3000";
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      console.error(error.code + " " + error.message);
      return encodedRedirect("error", "/sign-up", error.message);
    } 
    
    return encodedRedirect(
      "success",
      "/sign-up",
      "Thanks for signing up! Please check your email for a verification link.",
    );
  } catch (error) {
    console.error("Unexpected error during sign up:", error);
    return encodedRedirect(
      "error", 
      "/sign-up", 
      "An unexpected error occurred. Please try again."
    );
  }
};

export const signInAction = async (formData: FormData) => {
  // Get form data
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  
  if (!email || !password) {
    return encodedRedirect("error", "/sign-in", "Email and password are required");
  }
  
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error("Sign-in error:", error.message);
    return encodedRedirect("error", "/sign-in", error.message);
  }
  
  // Log successful authentication
  console.log("Login successful for:", email);
  
  // Ensure we have a session before redirecting
  if (!data?.session) {
    console.error("No session after login");
    return encodedRedirect("error", "/sign-in", "Authentication succeeded but no session was created. Please try again.");
  }
  
  // Add a small delay to ensure cookies are set properly
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Revalidate the root path to ensure it gets the latest auth state
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/", "layout");
  } catch (e) {
    console.log("Revalidation step - can be ignored in production");
  }
  
  // Redirect to the homepage - this will throw a NEXT_REDIRECT "error" which is expected
  // and will be handled by Next.js (it's not actually an error)
  redirect("/");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const headersList = await headers();
  const origin = headersList.get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password",
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password.",
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    return encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required",
    );
  }

  if (password !== confirmPassword) {
    return encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match",
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    return encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed",
    );
  }

  return encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
    return redirect("/sign-in");
  } catch (error) {
    console.error("Unexpected error during sign out:", error);
    return redirect("/sign-in");
  }
};
