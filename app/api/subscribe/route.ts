import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminClient } from "@/utils/supabase/admin";

export const runtime = "nodejs";

// Source must be a known value so the source column stays clean for
// downstream segmentation (e.g. emailing only coming-soon signups).
const SOURCE_VALUES = ["landing_footer", "coming_soon"] as const;
const BodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  source: z.enum(SOURCE_VALUES).optional().default("landing_footer"),
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

  const { email, source } = parsed.data;
  const admin = getAdminClient();

  // Burst brake (2026-06-09 audit, M2): this is a public, service-role
  // insert with no captcha. A global hourly cap stops a bot from bloating
  // the table / poisoning the mailing list overnight. Generous enough that
  // real launch-day traffic won't hit it; tune via SUBSCRIBE_HOURLY_LIMIT.
  const hourlyLimit = Number.parseInt(process.env.SUBSCRIBE_HOURLY_LIMIT || "100", 10);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("newsletter_signups")
    .select("id", { count: "exact", head: true })
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= hourlyLimit) {
    return NextResponse.json(
      { error: "Too many signups right now — please try again later." },
      { status: 429, headers: { "Retry-After": "3600" } },
    );
  }

  // Cast until Supabase types are generated; the admin client is untyped.
  const { error } = await admin
    .from("newsletter_signups")
    .insert({ email, source } as never);

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
