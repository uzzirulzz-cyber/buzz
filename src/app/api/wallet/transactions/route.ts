import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const [deposits, withdrawals, transfersOut, transfersIn, walletLogs, trades] = await Promise.all([
      db.depositRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
      db.withdrawalRequest.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50 }),
      db.transfer.findMany({ where: { senderId: user.id }, orderBy: { createdAt: "desc" }, take: 50, include: { recipient: { select: { email: true, name: true } } } }),
      db.transfer.findMany({ where: { recipientId: user.id }, orderBy: { createdAt: "desc" }, take: 50, include: { sender: { select: { email: true, name: true } } } }),
      db.walletLog.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 100 }),
      db.trade.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, symbol: true, direction: true, amount: true, profit: true, result: true, status: true, createdAt: true } }),
    ]);
    return NextResponse.json({ deposits, withdrawals, transfersOut, transfersIn, walletLogs, trades });
  } catch (err) { console.error("[wallet/transactions] error", err); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
