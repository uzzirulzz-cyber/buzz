import { NextResponse } from "next/server";

// Server-side logout is a no-op: the client clears localStorage.
export async function POST() {
  return NextResponse.json({ ok: true });
}
