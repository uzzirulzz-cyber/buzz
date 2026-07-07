import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  requireRole,
  toSafeUser,
  logAction,
  hashPassword,
} from "@/lib/api-auth";

/** GET — all users (super admin only). */
export async function GET(req: NextRequest) {
  const guard = await requireRole(req, "SUPER_ADMIN");
  if ("error" in guard) return guard.error;

  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { trades: true, transactions: true } } },
    });
    return NextResponse.json({
      users: users.map((u) => ({
        ...toSafeUser(u),
        tradesCount: u._count.trades,
        transactionsCount: u._count.transactions,
      })),
    });
  } catch (err) {
    console.error("[superadmin/users] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** PATCH — manage user: freeze/unfreeze, change role, reset password. */
export async function PATCH(req: NextRequest) {
  const guard = await requireRole(req, "SUPER_ADMIN");
  if ("error" in guard) return guard.error;
  const { user: admin } = guard;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      userId?: string;
      action?: "freeze" | "unfreeze" | "resetPassword" | "setRole";
      role?: string;
      newPassword?: string;
    };
    if (!body.userId || !body.action) {
      return NextResponse.json({ error: "userId and action required" }, { status: 400 });
    }
    const target = await db.user.findUnique({ where: { id: body.userId } });
    if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

    let updated = target;
    if (body.action === "freeze" || body.action === "unfreeze") {
      updated = await db.user.update({
        where: { id: body.userId },
        data: { frozen: body.action === "freeze" },
      });
    } else if (body.action === "resetPassword") {
      const pwd = body.newPassword || "default";
      updated = await db.user.update({
        where: { id: body.userId },
        data: {
          passwordHash: await hashPassword(pwd),
          mustChangePassword: true,
        },
      });
    } else if (body.action === "setRole") {
      const role = body.role === "SUPER_ADMIN" || body.role === "SUB_AGENT" ? body.role : "CUSTOMER";
      updated = await db.user.update({ where: { id: body.userId }, data: { role } });
    }
    await logAction({
      actorId: admin.id,
      action: body.action.toUpperCase(),
      targetId: body.userId,
      detail: body.action === "resetPassword" ? "Password reset to default" : "",
    });
    return NextResponse.json({ user: toSafeUser(updated) });
  } catch (err) {
    console.error("[superadmin/users PATCH] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/** DELETE — delete a user (super admin only). */
export async function DELETE(req: NextRequest) {
  const guard = await requireRole(req, "SUPER_ADMIN");
  if ("error" in guard) return guard.error;
  const { user: admin } = guard;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  try {
    await db.user.delete({ where: { id: userId } });
    await logAction({ actorId: admin.id, action: "DELETE_USER", targetId: userId });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[superadmin/users DELETE] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
