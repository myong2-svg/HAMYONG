import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const trip = await prisma.trip.findUnique({
    where: { id: Number(id) },
    include: {
      participants: { include: { member: true } },
      expenses: { include: { paidBy: true } },
    },
  });
  return NextResponse.json(trip);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const trip = await prisma.trip.update({
    where: { id: Number(id) },
    data: {
      title: body.title,
      location: body.location,
      date: new Date(body.date),
      description: body.description || null,
      status: body.status,
    },
  });
  return NextResponse.json(trip);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tripId = Number(id);
  await prisma.tripParticipant.deleteMany({ where: { tripId } });
  await prisma.expense.updateMany({ where: { tripId }, data: { tripId: null } });
  await prisma.trip.delete({ where: { id: tripId } });
  return NextResponse.json({ ok: true });
}
