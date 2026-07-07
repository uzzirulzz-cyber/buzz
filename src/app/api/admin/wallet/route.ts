import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole, logAction } from "@/lib/api-auth";

export async function PATCH(req: NextRequest) {
  const guard = await requireRole(req, "SUPER_ADMIN");
  if ("error" in guard) return guard.error;
  const { user: admin } = guard;
  try {
    const body = await req.json().catch(() => ({}));
    if (!body.userId || !body.action) return NextResponse.json({ error: "userId and action required" }, { status: 400 });
    const target = await db.user.findUnique({ where: { id: body.userId } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const amount = Number(body.amount) || 0;
    switch (body.action) {
      case "FREEZE_FUNDS": {
        const move = Math.min(amount, target.balance);
        await db.$transaction([
          db.user.update({ where: { id: target.id }, data: { balance: { decrement: move }, frozenFunds: { increment: move } } }),
          db.walletLog.create({ data: { userId: target.id, type: "FREEZE", amount: -move, balanceAfter: target.balance - move, reference: String(body.reason || "Funds frozen") } }),
        ]);
        break;
      }
      case "UNFREEZE_FUNDS": {
        const move = Math.min(amount, target.frozenFunds);
        await db.$transaction([
          db.user.update({ where: { id: target.id }, data: { frozenFunds: { decrement: move }, balance: { increment: move } } }),
          db.walletLog.create({ data: { userId: target.id, type: "UNFREEZE", amount: move, balanceAfter: target.balance + move, reference: String(body.reason || "Funds unfrozen") } }),
        ]);
        break;
      }
      case "CREDIT":
        await db.$transaction([
          db.user.update({ where: { id: target.id }, data: { balance: { increment: amount } } }),
          db.walletLog.create({ data: { userId: target.id, type: "CREDIT", amount, balanceAfter: target.balance + amount, reference: String(body.reason || "Manual credit") } }),
        ]);
        break;
      case "DEBIT":
        await db.$transaction([
          db.user.update({ where: { id: target.id }, data: { balance: { decrement: amount } } }),
          db.walletLog.create({ data: { userId: target.id, type: "DEBIT", amount: -amount, balanceAfter: target.balance - amount, reference: String(body.reason || "Manual debit") } }),
        ]);
        break;
      case "LOCK_WALLET": await db.user.update({ where: { id: target.id }, data: { walletLocked: true } }); break;
      case "UNLOCK_WALLET": await db.user.update({ where: { id: target.id }, data: { walletLocked: false } }); break;
      case "FREEZE_ACCOUNT": await db.user.update({ where: { id: target.id }, data: { frozen: true } }); break;
      case "UNFREEZE_ACCOUNT": await db.user.update({ where: { id: target.id }, data: { frozen: false } }); break;
      default: return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    await logAction({ actorId: admin.id, action: body.action, targetId: target.id, detail: `${amount} USDT — ${body.reason || ""}` });
    return NextResponse.json({ ok: true });
  } catch (err) { console.error("[admin/wallet PATCH] error", err); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
