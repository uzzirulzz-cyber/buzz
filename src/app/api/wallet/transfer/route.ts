import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAuthUser, logAction } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role !== "CUSTOMER") return NextResponse.json({ error: "Customers only" }, { status: 403 });
  try {
    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);
    const recipientEmail = String(body.recipientEmail || "").trim().toLowerCase();
    if (!amount || amount <= 0) return NextResponse.json({ error: "Valid amount required" }, { status: 400 });
    if (!recipientEmail) return NextResponse.json({ error: "Recipient email required" }, { status: 400 });
    const [sender, recipient] = await Promise.all([
      db.user.findUnique({ where: { id: user.id } }),
      db.user.findUnique({ where: { email: recipientEmail } }),
    ]);
    if (!sender || !recipient || recipient.role !== "CUSTOMER") return NextResponse.json({ error: "Recipient not found" }, { status: 404 });
    if (recipient.id === sender.id) return NextResponse.json({ error: "Cannot transfer to yourself" }, { status: 400 });
    if (sender.walletLocked) return NextResponse.json({ error: "Wallet locked" }, { status: 403 });
    if (amount > sender.balance) return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
    await db.$transaction([
      db.user.update({ where: { id: sender.id }, data: { balance: { decrement: amount } } }),
      db.user.update({ where: { id: recipient.id }, data: { balance: { increment: amount } } }),
      db.transfer.create({ data: { senderId: sender.id, recipientId: recipient.id, amount, note: String(body.note || ""), status: "COMPLETED" } }),
      db.walletLog.create({ data: { userId: sender.id, type: "TRANSFER_OUT", amount: -amount, balanceAfter: sender.balance - amount, reference: `To ${recipientEmail}` } }),
      db.walletLog.create({ data: { userId: recipient.id, type: "TRANSFER_IN", amount, balanceAfter: recipient.balance + amount, reference: `From ${sender.email}` } }),
    ]);
    await logAction({ actorId: user.id, action: "TRANSFER_SENT", detail: `${amount} USDT to ${recipientEmail}` });
    return NextResponse.json({ ok: true });
  } catch (err) { console.error("[wallet/transfer] error", err); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
}
