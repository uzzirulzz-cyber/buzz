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
    if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (u.walletLocked) return NextResponse.json({ error: "Wallet is locked" }, { status: 403 });
    if (amount > u.balance) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    const [withdrawal] = await db.$transaction([
      db.withdrawalRequest.create({ data: { userId: user.id, amount, method: String(body.method || "USDT"), destination: String(body.destination || ""), status: "PENDING" } }),
      db.user.update({ where: { id: user.id }, data: { balance: { decrement: amount } } }),
      db.walletLog.create({ data: { userId: user.id, type: "WITHDRAW", amount: -amount, balanceAfter: u.balance - amount, reference: "Withdrawal request (pending)" } }),
    ]);
    await logAction({ actorId: user.id, action: "WITHDRAWAL_REQUESTED", targetId: withdrawal.id, detail: `${amount} USDT` });
    return NextResponse.json({ withdrawal }, { status: 201 });
  } catch (err) { console.error("[wallet/withdraw] error", err); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
