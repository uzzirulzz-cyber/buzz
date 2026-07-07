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
    const withdrawals = await db.withdrawalRequest.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { user: { select: { id: true, name: true, email: true } } } });
    return NextResponse.json({ withdrawals });
  } catch (err) { console.error("[admin/withdrawals GET] error", err); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}

export async function PATCH(req: NextRequest) {
  const guard = await requireRole(req, "SUPER_ADMIN");
  if ("error" in guard) return guard.error;
  const { user: admin } = guard;
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.id || !body.action) return NextResponse.json({ error: "id and action required" }, { status: 400 });
    const w = await db.withdrawalRequest.findUnique({ where: { id: body.id }, include: { user: true } });
    if (!w) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (w.status !== "PENDING" && w.status !== "ON_HOLD") return NextResponse.json({ error: "Already processed" }, { status: 400 });
    if (body.action === "APPROVE") {
      await db.withdrawalRequest.update({ where: { id: body.id }, data: { status: "APPROVED", adminNote: String(body.adminNote || ""), processedById: admin.id, processedAt: new Date() } });
      await logAction({ actorId: admin.id, action: "WITHDRAWAL_APPROVED", targetId: w.id, detail: `${w.amount} USDT` });
    } else if (body.action === "REJECT") {
      await db.$transaction([
        db.withdrawalRequest.update({ where: { id: body.id }, data: { status: "REJECTED", adminNote: String(body.adminNote || ""), processedById: admin.id, processedAt: new Date() } }),
        db.user.update({ where: { id: w.userId }, data: { balance: { increment: w.amount } } }),
        db.walletLog.create({ data: { userId: w.userId, type: "DEPOSIT", amount: w.amount, balanceAfter: w.user.balance + w.amount, reference: "Withdrawal rejected — refunded" } }),
      ]);
      await logAction({ actorId: admin.id, action: "WITHDRAWAL_REJECTED", targetId: w.id, detail: `${w.amount} USDT refunded` });
    } else {
      await db.withdrawalRequest.update({ where: { id: body.id }, data: { status: "ON_HOLD", adminNote: String(body.adminNote || ""), processedById: admin.id } });
      await logAction({ actorId: admin.id, action: "WITHDRAWAL_HELD", targetId: w.id, detail: `${w.amount} USDT` });
    }
    return NextResponse.json({ ok: true });
  } catch (err) { console.error("[admin/withdrawals PATCH] error", err); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
