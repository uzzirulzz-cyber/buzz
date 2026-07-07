import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    // Per spec: return 200 with `{ user: null }` when unauthenticated.
    return NextResponse.json({ user });
  } catch (err) {
    console.error("[auth/me] error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
