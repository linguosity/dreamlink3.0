// app/api/auth/signout/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  // clears the sb-… cookies
  await supabase.auth.signOut();

  // read an optional ?redirect_to=… query param
  const { origin, searchParams } = new URL(request.url);
  const nextLocation = searchParams.get("redirect_to") || "/sign-in";

  return NextResponse.redirect(new URL(nextLocation, origin));
}