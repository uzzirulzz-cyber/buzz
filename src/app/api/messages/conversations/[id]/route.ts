import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/api-auth";

/** GET — fetch all messages in a conversation (with RBAC visibility check). */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id: convId } = await params;

  try {
    const conv = await db.conversation.findUnique({
      where: { id: convId },
      include: { customer: { select: { id: true, name: true, email: true } } },
    });
    if (!conv) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // RBAC visibility
    if (user.role === "CUSTOMER" && conv.customerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (user.role === "SUB_AGENT" && conv.subAgentId !== user.id && conv.customerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const messages = await db.message.findMany({
      where: { conversationId: convId },
      orderBy: { createdAt: "asc" },
      include: { sender: { select: { id: true, name: true, role: true } } },
    });

    // mark as read for the requesting user
    await db.conversationMember.upsert({
      where: { conversationId_userId: { conversationId: convId, userId: user.id } },
      update: { lastReadAt: new Date() },
      create: { conversationId: convId, userId: user.id, lastReadAt: new Date() },
    }).catch(() => null);

    return NextResponse.json({ conversation: conv, messages });
  } catch (err) {
    console.error("[messages/conversations/[id] GET] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
