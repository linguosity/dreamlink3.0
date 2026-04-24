import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

const BodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const { email } = parsed.data;
  const admin = getAdminClient();

  // Cast until Supabase types are generated; the admin client is untyped.
  const { error } = await admin
    .from("newsletter_signups")
    .insert({ email, source: "landing_footer" } as never);

  // 23505 = unique_violation → treat as success so we don't leak membership.
  if (error && error.code !== "23505") {
    console.error("[subscribe] insert failed", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
