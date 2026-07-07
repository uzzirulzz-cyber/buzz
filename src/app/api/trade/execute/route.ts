import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser, toSafeUser } from "@/lib/api-auth";
import { COINS, TRADE_OPTIONS } from "@/lib/market-data";

const ALLOWED_DURATIONS = [30, 60, 120];

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { symbol, direction, duration, amount } = body ?? {};

    // ---- Validation ----
    if (!symbol || !direction || duration == null || amount == null) {
      return NextResponse.json(
        { error: "Missing fields: symbol, direction, duration, amount" },
        { status: 400 }
      );
    }

    const pair = String(symbol);
    const coin = COINS.find((c) => c.pair === pair || c.symbol === pair.toUpperCase());
    if (!coin) {
      return NextResponse.json(
        { error: "Unknown symbol" },
        { status: 400 }
      );
    }

    const dir = String(direction).toUpperCase();
    if (dir !== "UP" && dir !== "DOWN") {
      return NextResponse.json(
        { error: "direction must be UP or DOWN" },
        { status: 400 }
      );
    }

    const dur = Number(duration);
    if (!ALLOWED_DURATIONS.includes(dur)) {
      return NextResponse.json(
        { error: "duration must be 30, 60, or 120" },
        { status: 400 }
      );
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json(
        { error: "amount must be > 0" },
        { status: 400 }
      );
    }

    // Re-load fresh user from DB to get authoritative balance.
    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (dbUser.frozen) {
      return NextResponse.json({ error: "Account frozen" }, { status: 403 });
    }
    if (amt > dbUser.balance) {
      return NextResponse.json(
        { error: "Insufficient balance" },
        { status: 400 }
      );
    }

    const payoutRate = TRADE_OPTIONS.find((t) => t.duration === dur)?.payoutRate ?? 0;
    const entryPrice = coin.basePrice * (1 + (Math.random() - 0.5) * 0.004);
    const expiresAt = new Date(Date.now() + dur * 1000);

    const [trade, updatedUser] = await db.$transaction([
      db.trade.create({
        data: {
          userId: dbUser.id,
          symbol: coin.pair,
          direction: dir,
          duration: dur,
          amount: amt,
          entryPrice,
          payoutRate,
          expiresAt,
          status: "ACTIVE",
          result: "PENDING",
        },
      }),
      db.user.update({
        where: { id: dbUser.id },
        data: { balance: { decrement: amt } },
      }),
    ]);

    return NextResponse.json({
      trade,
      user: toSafeUser(updatedUser),
    });
  } catch (err) {
    console.error("[trade/execute] error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
