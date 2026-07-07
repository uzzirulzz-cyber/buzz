import { NextResponse } from "next/server";
import { seedDefaultAccounts } from "@/lib/seed";

export async function POST() {
  try {
    const result = await seedDefaultAccounts();
    return NextResponse.json({
      ok: true,
      ...result,
      message: `Seeded ${result.created} accounts, ${result.skipped} already existed.`,
    });
  } catch (err) {
    console.error("[auth/seed] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** GET also seeds (idempotent) so the frontend can trigger it on first admin-login load. */
export async function GET() {
  try {
    const result = await seedDefaultAccounts();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("[auth/seed] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
