import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, toSafeUser, logAction, generateUid } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { name, email, password, phone, phoneCode, country, referralCode } = body ?? {};

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields: name, email, password" },
        { status: 400 }
      );
    }
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Invitation-code system: customers MUST register with a valid invitation code
    // belonging to a Sub-Agent.
    if (!referralCode) {
      return NextResponse.json(
        { error: "An invitation code from your agent is required to register." },
        { status: 400 }
      );
    }
    const code = String(referralCode).trim().toUpperCase();
    const subAgent = await db.user.findUnique({ where: { invitationCode: code } });
    if (!subAgent || subAgent.role !== "SUB_AGENT") {
      return NextResponse.json(
        { error: "Invalid invitation code. Please contact your agent." },
        { status: 400 }
      );
    }

    const existing = await db.user.findUnique({ where: { email: String(email) } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }

    const uid = await generateUid();
    const user = await db.user.create({
      data: {
        uid,
        name: String(name),
        email: String(email),
        passwordHash: await hashPassword(String(password)),
        country: country ? String(country) : "",
        phone: phone || phoneCode ? `${phoneCode || "+1"} ${String(phone || "").replace(/^\+?\d+\s*/, "")}`.trim() : "",
        role: "CUSTOMER",
        balance: 0,
        vipLevel: 1,
        linkedSubAgentId: subAgent.id,
        registeredAt: new Date(),
        kycStatus: "PENDING",
        status: "ACTIVE",
      },
    });

    await logAction({
      actorId: user.id,
      action: "CUSTOMER_REGISTERED",
      targetId: subAgent.id,
      detail: `Customer registered with invitation code ${code}`,
    });

    return NextResponse.json({ user: toSafeUser(user) }, { status: 201 });
  } catch (err) {
    console.error("[auth/register] error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
