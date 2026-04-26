import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const participant = await prisma.tripParticipant.upsert({
    where: { tripId_memberId: { tripId: Number(id), memberId: body.memberId } },
    update: { paid: body.paid ?? false, amount: body.amount ?? 0 },
    create: { tripId: Number(id), memberId: body.memberId, paid: body.paid ?? false, amount: body.amount ?? 0 },
  });
  return NextResponse.json(participant);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { memberId } = await req.json();
  await prisma.tripParticipant.delete({
    where: { tripId_memberId: { tripId: Number(id), memberId } },
  });
  return NextResponse.json({ ok: true });
}
