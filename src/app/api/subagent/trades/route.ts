import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, getSubAgentCustomerIds } from "@/lib/api-auth";

/** GET — trades for the sub-agent's own customers only. */
export async function GET(req: NextRequest) {
  const guard = await requireRole(req, "SUB_AGENT");
  if ("error" in guard) return guard.error;
  const { user } = guard;

  try {
    const customerIds = await getSubAgentCustomerIds(user.id);
    if (customerIds.length === 0) return NextResponse.json({ trades: [] });

    const trades = await db.trade.findMany({
      where: { userId: { in: customerIds } },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true, email: true } } },
    });
    return NextResponse.json({ trades });
  } catch (err) {
    console.error("[subagent/trades] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
