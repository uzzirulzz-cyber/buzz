import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/api-auth";

/**
 * GET — list conversations visible to the caller:
 *  - CUSTOMER: only their own conversations
 *  - SUB_AGENT: conversations of their own customers + conversations routed to them
 *  - SUPER_ADMIN: all conversations
 *
 * POST — create a new support conversation (customers start a chat).
 */
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    let where = {};
    if (user.role === "CUSTOMER") {
      where = { customerId: user.id };
    } else if (user.role === "SUB_AGENT") {
      // Sub-agent sees conversations routed to them OR conversations of their customers
      where = { subAgentId: user.id };
    }
    // SUPER_ADMIN: where = {} (all)

    const conversations = await db.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("[messages/conversations GET] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { subject, initialMessage } = (await req.json().catch(() => ({}))) as {
      subject?: string;
      initialMessage?: string;
    };

    // Customers create conversations tied to themselves + their sub-agent
    if (user.role === "CUSTOMER") {
      const customer = await db.user.findUnique({
        where: { id: user.id },
        select: { linkedSubAgentId: true },
      });
      const conv = await db.conversation.create({
        data: {
          subject: subject || "Support",
          customerId: user.id,
          subAgentId: customer?.linkedSubAgentId || null,
        },
      });
      if (initialMessage) {
        await db.message.create({
          data: {
            conversationId: conv.id,
            senderId: user.id,
            senderRole: "CUSTOMER",
            body: String(initialMessage),
          },
        });
      }
      // Add customer + sub-agent as members
      await db.conversationMember.createMany({
        data: [
          { conversationId: conv.id, userId: user.id },
          ...(customer?.linkedSubAgentId
            ? [{ conversationId: conv.id, userId: customer.linkedSubAgentId }]
            : []),
        ],
      });
      return NextResponse.json({ conversation: conv }, { status: 201 });
    }

    // Support staff (sub-agent/super-admin) cannot create customer conversations
    return NextResponse.json(
      { error: "Only customers can start support conversations" },
      { status: 403 }
    );
  } catch (err) {
    console.error("[messages/conversations POST] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
