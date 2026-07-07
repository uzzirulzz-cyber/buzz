import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser, hashPassword, toSafeUser, logAction } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  try {
    const authUser = await getAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => ({}));
    const { currentPassword, newPassword } = body ?? {};

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Current password and new password are required" },
        { status: 400 }
      );
    }
    if (String(newPassword).length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({ where: { id: authUser.id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify current password before allowing a change.
    const { verifyPassword } = await import("@/lib/api-auth");
    const ok = await verifyPassword(String(currentPassword), user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });
    }
    if (String(newPassword) === String(currentPassword)) {
      return NextResponse.json(
        { error: "New password must be different from the current password" },
        { status: 400 }
      );
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(String(newPassword)),
        mustChangePassword: false,
      },
    });

    await logAction({
      actorId: user.id,
      action: "PASSWORD_CHANGED",
      detail: user.mustChangePassword ? "First-login forced change" : "Self-initiated change",
    });

    return NextResponse.json({ user: toSafeUser(updated) });
  } catch (err) {
    console.error("[auth/change-password] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
