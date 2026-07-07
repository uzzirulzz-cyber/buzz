import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser, toSafeUser } from "@/lib/api-auth";
import { COINS, settleTrade } from "@/lib/market-data";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { tradeId } = body ?? {};
    if (!tradeId) {
      return NextResponse.json(
        { error: "Missing tradeId" },
        { status: 400 }
      );
    }

    const trade = await db.trade.findUnique({
      where: { id: String(tradeId) },
      include: { user: true },
    });
    if (!trade) {
      return NextResponse.json({ error: "Trade not found" }, { status: 404 });
    }
    if (trade.userId !== user.id && user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (trade.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Trade is not active" },
        { status: 409 }
      );
    }

    const coin = COINS.find((c) => c.pair === trade.symbol);
    if (!coin) {
      return NextResponse.json(
        { error: "Symbol no longer supported" },
        { status: 500 }
      );
    }

    const exitPrice = coin.basePrice * (1 + (Math.random() - 0.5) * 0.012);
    const result = settleTrade(
      trade.direction as "UP" | "DOWN",
      trade.entryPrice,
      exitPrice
    );

    const isWin = result === "WIN";
    const profit = isWin ? trade.amount * trade.payoutRate : -trade.amount;
    // Balance math:
    //  - WIN: stake (already deducted) is returned + payout, so add amount + profit.
    //  - LOSE: stake stays deducted (already gone), no balance change here.
    const balanceDelta = isWin ? trade.amount + profit : 0;

    const txType = isWin ? "TRADE_PROFIT" : "TRADE_LOSS";
    const txAmount = isWin ? profit : -trade.amount;

    const updatedTrade = await db.trade.update({
      where: { id: trade.id },
      data: {
        exitPrice,
        result,
        profit,
        status: "SETTLED",
        settledAt: new Date(),
      },
    });

    let updatedUser = trade.user;
    if (balanceDelta !== 0) {
      updatedUser = await db.user.update({
        where: { id: trade.userId },
        data: { balance: { increment: balanceDelta } },
      });
    }

    await db.transaction.create({
      data: {
        userId: trade.userId,
        type: txType,
        amount: txAmount,
        method: "TRADE",
        status: "APPROVED",
        reference: trade.id,
      },
    });

    return NextResponse.json({
      trade: updatedTrade,
      user: toSafeUser(updatedUser),
      result,
      profit,
    });
  } catch (err) {
    console.error("[trade/settle] error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
