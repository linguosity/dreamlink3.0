// app/api/cron/analytics-digest/route.ts
//
// Manual/testing entry point for the founders' analytics digest. The DAILY
// evaluation does not live here — it piggybacks on the morning-reminders
// cron (see that route), because Vercel Hobby allows only two cron jobs and
// both slots are spent. This route exists so an admin (or Claude) can:
//
//   GET /api/cron/analytics-digest            → normal tick (due-day + dedupe honored)
//   GET /api/cron/analytics-digest?force=1    → send now regardless of schedule
//
// Auth: same Bearer CRON_SECRET as every other cron route.

import { NextResponse } from "next/server";
import { authorizeCronRequest } from "@/lib/cron";
import { runAnalyticsDigestTick } from "@/lib/analyticsDigest";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // Vercel Hobby plan limit

export async function GET(request: Request) {
  const denied = authorizeCronRequest(request);
  if (denied) return denied;

  const force = new URL(request.url).searchParams.get("force") === "1";
  const result = await runAnalyticsDigestTick({ force });
  const status = result.status === "error" ? 500 : 200;
  return NextResponse.json(result, { status });
}
