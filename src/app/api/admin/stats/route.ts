import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/api-auth";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (user.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const now = new Date();
    const todayStart = startOfDay(now);
    const yesterday24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = startOfDay(new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000));

    // ---- Counts ----
    const [
      totalUsers,
      activeUsersAgg,
      totalTrades,
      activeTrades,
      revenueAgg,
      totalDepositsAgg,
      totalWithdrawalsAgg,
      todayDepositsAgg,
      todayWithdrawalsAgg,
      settledLast7d,
      coinVolumeAgg,
    ] = await Promise.all([
      db.user.count(),

      // active users: distinct userIds in trades created in last 24h
      db.trade.groupBy({
        by: ["userId"],
        where: { createdAt: { gt: yesterday24h } },
        _count: { _all: true },
      }),

      db.trade.count(),
      db.trade.count({ where: { status: "ACTIVE" } }),

      // revenue = sum of -profit for settled trades (house profit)
      db.trade.aggregate({
        where: { status: "SETTLED" },
        _sum: { profit: true },
      }),

      db.transaction.aggregate({
        where: {
          type: "DEPOSIT",
          status: { in: ["APPROVED", "PENDING"] },
        },
        _sum: { amount: true },
      }),

      db.transaction.aggregate({
        where: { type: "WITHDRAW" },
        _sum: { amount: true },
      }),

      db.transaction.aggregate({
        where: {
          type: "DEPOSIT",
          status: { in: ["APPROVED", "PENDING"] },
          createdAt: { gte: todayStart },
        },
        _sum: { amount: true },
      }),

      db.transaction.aggregate({
        where: {
          type: "WITHDRAW",
          createdAt: { gte: todayStart },
        },
        _sum: { amount: true },
      }),

      db.trade.findMany({
        where: {
          status: "SETTLED",
          settledAt: { gte: sevenDaysAgo },
        },
        select: { profit: true, settledAt: true },
      }),

      db.trade.groupBy({
        by: ["symbol"],
        _count: { _all: true },
        orderBy: { _count: { symbol: "desc" } },
        take: 5,
      }),
    ]);

    // ---- 7-day revenue series ----
    const series: { date: string; revenue: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = startOfDay(new Date(now.getTime() - i * 24 * 60 * 60 * 1000));
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      const dayProfit = settledLast7d
        .filter((t) => {
          const s = t.settledAt;
          return s != null && s >= dayStart && s < dayEnd;
        })
        .reduce((sum, t) => sum + (t.profit ?? 0), 0);
      series.push({
        date: DAY_LABELS[dayStart.getDay()],
        revenue: -dayProfit, // house revenue = -profit
      });
    }

    const coinVolume = coinVolumeAgg.map((g) => ({
      symbol: g.symbol,
      count: g._count._all,
    }));

    const revenue = -(revenueAgg._sum.profit ?? 0);

    return NextResponse.json({
      totalUsers,
      activeUsers: activeUsersAgg.length,
      totalTrades,
      activeTrades,
      revenue,
      totalDeposits: totalDepositsAgg._sum.amount ?? 0,
      totalWithdrawals: totalWithdrawalsAgg._sum.amount ?? 0,
      todayDeposits: todayDepositsAgg._sum.amount ?? 0,
      todayWithdrawals: todayWithdrawalsAgg._sum.amount ?? 0,
      revenueSeries: series,
      coinVolume,
    });
  } catch (err) {
    console.error("[admin/stats] error", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
