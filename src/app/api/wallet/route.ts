import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "CUSTOMER") return NextResponse.json({ error: "Customers only" }, { status: 403 });
  try {
    const u = await db.user.findUnique({ where: { id: user.id } });
    if (!u) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const activeTrades = await db.trade.aggregate({ where: { userId: user.id, status: "ACTIVE" }, _sum: { amount: true } });
    const wins = await db.trade.aggregate({ where: { userId: user.id, result: "WIN" }, _sum: { profit: true } });
    const losses = await db.trade.aggregate({ where: { userId: user.id, result: "LOSE" }, _sum: { profit: true } });
    const totalProfit = (wins._sum.profit || 0) + (losses._sum.profit || 0);
    const pendingDeposits = await db.depositRequest.aggregate({ where: { userId: user.id, status: "PENDING" }, _sum: { amount: true } });
    const pendingWithdrawals = await db.withdrawalRequest.aggregate({ where: { userId: user.id, status: "PENDING" }, _sum: { amount: true } });
    const bonuses = await db.walletLog.aggregate({ where: { userId: user.id, type: "BONUS" }, _sum: { amount: true } });
    const fundsInTrading = activeTrades._sum.amount || 0;
    return NextResponse.json({ overview: {
      totalAssetValue: u.balance + fundsInTrading + u.frozenFunds,
      availableBalance: u.balance, frozenFunds: u.frozenFunds, creditBalance: u.creditBalance,
      totalProfitGenerated: totalProfit, fundsInTrading,
      pendingDeposits: pendingDeposits._sum.amount || 0, pendingWithdrawals: pendingWithdrawals._sum.amount || 0,
      totalEarnings: totalProfit + (bonuses._sum.amount || 0), walletLocked: u.walletLocked,
      accountStatus: u.frozen ? "FROZEN" : "ACTIVE", tradingCycleStatus: fundsInTrading > 0 ? "ACTIVE" : "IDLE",
      lastUpdated: new Date().toISOString(),
    }});
  } catch (err) { console.error("[wallet] error", err); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
