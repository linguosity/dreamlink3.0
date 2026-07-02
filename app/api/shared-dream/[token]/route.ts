// app/api/shared-dream/[token]/route.ts
//
// Public, unauthenticated read path for dreams the owner has explicitly
// shared. This is the ONLY way a non-owner can read a dream.
//
// The fetch + whitelist logic lives in lib/sharedDream.ts, shared with the
// server-rendered share page (app/shared/dream/[id]/page.tsx).

import { NextResponse } from "next/server";
import { getSharedDream } from "@/lib/sharedDream";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  try {
    const dream = await getSharedDream(token);

    if (!dream) {
      // Malformed token, wrong token, or sharing was revoked.
      return NextResponse.json(
        { error: "This dream is no longer shared" },
        { status: 404 },
      );
    }

    return NextResponse.json({ dream });
  } catch {
    return NextResponse.json(
      { error: "Could not load shared dream" },
      { status: 500 },
    );
  }
}
