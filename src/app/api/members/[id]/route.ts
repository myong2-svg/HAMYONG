import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const member = await prisma.member.update({
    where: { id: Number(id) },
    data: {
      name: body.name,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      birthDate: body.birthDate || null,
      bankInfo: body.bankInfo || null,
      note: body.note || null,
      role: body.role,
      active: body.active,
    },
  });
  return NextResponse.json(member);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const memberId = Number(id);

  // 관련 데이터 먼저 삭제 (cascade)
  await prisma.tripParticipant.deleteMany({ where: { memberId } });
  await prisma.fee.deleteMany({ where: { memberId } });
  await prisma.expense.updateMany({ where: { paidById: memberId }, data: { paidById: null } });
  await prisma.member.delete({ where: { id: memberId } });

  return NextResponse.json({ ok: true });
}
