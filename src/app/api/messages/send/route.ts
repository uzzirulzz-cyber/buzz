import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/api-auth";

/** POST — send a message in a conversation. */
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { conversationId, body } = (await req.json().catch(() => ({}))) as {
      conversationId?: string;
      body?: string;
    };
    if (!conversationId || !body || !String(body).trim()) {
      return NextResponse.json({ error: "conversationId and body required" }, { status: 400 });
    }

    const conv = await db.conversation.findUnique({
      where: { id: conversationId },
    });
    if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });

    // RBAC visibility
    if (user.role === "CUSTOMER" && conv.customerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (user.role === "SUB_AGENT" && conv.subAgentId !== user.id && conv.customerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const senderRole = user.role === "CUSTOMER" ? "CUSTOMER" : "SUPPORT";

    const message = await db.message.create({
      data: {
        conversationId,
        senderId: user.id,
        senderRole,
        body: String(body).trim(),
      },
    });

    // bump conversation updatedAt so it sorts to top
    await db.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message }, { status: 201 });
  } catch (err) {
    console.error("[messages/send] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
