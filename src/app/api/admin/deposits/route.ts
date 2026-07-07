import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, logAction } from "@/lib/api-auth";

export async function GET(req: NextRequest) {
  const guard = await requireRole(req, "SUPER_ADMIN", "SUB_AGENT");
  if ("error" in guard) return guard.error;
  const { user } = guard;
  try {
    let where = {};
    if (user.role === "SUB_AGENT") {
      const customers = await db.user.findMany({ where: { linkedSubAgentId: user.id, role: "CUSTOMER" }, select: { id: true } });
      where = { userId: { in: customers.map((c) => c.id) } };
    }
    const deposits = await db.depositRequest.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { id: true, name: true, email: true } } } });
    return NextResponse.json({ deposits });
  } catch (err) { console.error("[admin/deposits GET] error", err); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireRole(req, "SUPER_ADMIN");
  if ("error" in guard) return guard.error;
  const { user: admin } = guard;
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.id || !body.action) return NextResponse.json({ error: "id and action required" }, { status: 400 });
    const deposit = await db.depositRequest.findUnique({ where: { id: body.id }, include: { user: true } });
    if (!deposit) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (deposit.status !== "PENDING") return NextResponse.json({ error: "Already processed" }, { status: 400 });
    const finalAmount = body.editedAmount ? Number(body.editedAmount) : deposit.amount;
    if (body.action === "APPROVE") {
      await db.$transaction([
        db.depositRequest.update({ where: { id: body.id }, data: { status: "APPROVED", editedAmount: body.editedAmount ? finalAmount : null, adminNote: String(body.adminNote || ""), processedById: admin.id, processedAt: new Date() } }),
        db.user.update({ where: { id: deposit.userId }, data: { balance: { increment: finalAmount } } }),
        db.walletLog.create({ data: { userId: deposit.userId, type: "DEPOSIT", amount: finalAmount, balanceAfter: deposit.user.balance + finalAmount, reference: `Deposit ${deposit.method} approved` } }),
      ]);
      await logAction({ actorId: admin.id, action: "DEPOSIT_APPROVED", targetId: deposit.id, detail: `${finalAmount} USDT` });
    } else {
      await db.depositRequest.update({ where: { id: body.id }, data: { status: "REJECTED", adminNote: String(body.adminNote || ""), processedById: admin.id, processedAt: new Date() } });
      await logAction({ actorId: admin.id, action: "DEPOSIT_REJECTED", targetId: deposit.id, detail: `${deposit.amount} USDT` });
    }
    return NextResponse.json({ ok: true });
  } catch (err) { console.error("[admin/deposits PATCH] error", err); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
