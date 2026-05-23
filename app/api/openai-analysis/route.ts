// app/api/openai-analysis/route.ts
//
// Thin HTTP wrapper around the shared runDreamAnalysis() function in
// lib/dreamAnalysis.ts. The route exists for direct API calls (curl, future
// streaming variants); dream-entries calls runDreamAnalysis() directly to
// avoid the parallelism issues that arise when fanning out via synthetic
// NextRequest objects.

import { NextResponse } from "next/server";
import { runDreamAnalysis } from "@/lib/dreamAnalysis";

export const runtime = "edge";

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { dream, topic, readingLevel, analysisDepth } = body ?? {};

  if (!dream) {
    return NextResponse.json(
      { error: "Dream content is required" },
      { status: 400 },
    );
  }

  const { analysis, usage } = await runDreamAnalysis({
    dream,
    topic,
    readingLevel,
    analysisDepth,
  });

  // Preserve the previous response shape (analysis fields at the top level)
  // and add a `_usage` block so callers that care about token counts can read
  // it without breaking older consumers that don't.
  return NextResponse.json({ ...analysis, _usage: usage });
}
