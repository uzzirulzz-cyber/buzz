import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser, logAction } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "CUSTOMER") return NextResponse.json({ error: "Customers only" }, { status: 403 });
  try {
    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    if (!amount || amount <= 0) return NextResponse.json({ error: "Valid amount required" }, { status: 400 });
    const u = await db.user.findUnique({ where: { id: user.id } });
    if (u?.walletLocked) return NextResponse.json({ error: "Wallet is locked" }, { status: 403 });
    const deposit = await db.depositRequest.create({ data: { userId: user.id, amount, method: String(body.method || "USDT"), reference: String(body.reference || ""), proofUrl: String(body.proofUrl || ""), status: "PENDING" } });
    await logAction({ actorId: user.id, action: "DEPOSIT_REQUESTED", targetId: deposit.id, detail: `${amount} USDT` });
    return NextResponse.json({ deposit }, { status: 201 });
  } catch (err) { console.error("[wallet/deposit] error", err); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
