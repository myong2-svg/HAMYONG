import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const members = await prisma.member.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      fees: { where: { status: "unpaid" } },
    },
  });
  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "이름은 필수입니다." }, { status: 400 });
  }
  try {
    const member = await prisma.member.create({
      data: {
        name: body.name.trim(),
        phone: body.phone || null,
        email: body.email || null,
        address: body.address || null,
        birthDate: body.birthDate || null,
        bankInfo: body.bankInfo || null,
        note: body.note || null,
        role: body.role || "member",
        joinDate: body.joinDate ? new Date(body.joinDate) : new Date(),
      },
    });
    return NextResponse.json(member, { status: 201 });
  } catch (e: unknown) {
    console.error("회원 추가 오류:", e);
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
