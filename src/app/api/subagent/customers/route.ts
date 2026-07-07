import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, toSafeUser, logAction } from "@/lib/api-auth";

/** GET — sub-agent's own customers only (data isolation enforced). */
export async function GET(req: NextRequest) {
  const guard = await requireRole(req, "SUB_AGENT");
  if ("error" in guard) return guard.error;
  const { user } = guard;

  try {
    const customers = await db.user.findMany({
      where: { linkedSubAgentId: user.id, role: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { trades: true, transactions: true } } },
    });
    return NextResponse.json({
      customers: customers.map((c) => ({
        ...toSafeUser(c),
        tradesCount: c._count.trades,
        transactionsCount: c._count.transactions,
      })),
    });
  } catch (err) {
    console.error("[subagent/customers] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH — sub-agent suspends/activates their own customer only. */
export async function PATCH(req: NextRequest) {
  const guard = await requireRole(req, "SUB_AGENT");
  if ("error" in guard) return guard.error;
  const { user } = guard;

  try {
    const { customerId, action } = (await req.json().catch(() => ({}))) as {
      customerId?: string;
      action?: "freeze" | "unfreeze";
    };
    if (!customerId || !action) {
      return NextResponse.json({ error: "customerId and action required" }, { status: 400 });
    }
    // Verify ownership
    const customer = await db.user.findFirst({
      where: { id: customerId, linkedSubAgentId: user.id, role: "CUSTOMER" },
    });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found in your portfolio" }, { status: 404 });
    }
    const updated = await db.user.update({
      where: { id: customerId },
      data: { frozen: action === "freeze" },
    });
    await logAction({
      actorId: user.id,
      action: action === "freeze" ? "FREEZE_CUSTOMER" : "UNFREEZE_CUSTOMER",
      targetId: customerId,
    });
    return NextResponse.json({ customer: toSafeUser(updated) });
  } catch (err) {
    console.error("[subagent/customers PATCH] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
