// app/api/test-email/route.ts
//
// TEMPORARY smoke test for Resend. Hit GET /api/test-email in development to
// confirm your RESEND_API_KEY works end-to-end. Disabled in production so it
// can't be abused to send mail on a live deployment — delete this file once
// you've verified sending works.

import { NextResponse } from "next/server";
import { getResend } from "@/lib/resend";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const { data, error } = await getResend().emails.send({
      // onboarding@resend.dev is Resend's shared test sender — it only delivers
      // to your own Resend account email and needs no domain verification.
      // For production, verify dreamriver.io in Resend and switch this to
      // something like "DreamRiver <no-reply@dreamriver.io>".
      from: "onboarding@resend.dev",
      to: "brandon.c.brewer@gmail.com",
      subject: "Hello World",
      html: "<p>Congrats on sending your <strong>first email</strong>!</p>",
    });

    if (error) {
      return NextResponse.json({ ok: false, error }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data?.id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
