import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const expense = await prisma.expense.update({
    where: { id: Number(id) },
    data: {
      title: body.title,
      amount: Number(body.amount),
      category: body.category,
      date: new Date(body.date),
      description: body.description || null,
      paidById: body.paidById ? Number(body.paidById) : null,
      tripId: body.tripId ? Number(body.tripId) : null,
    },
  });
  return NextResponse.json(expense);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await prisma.expense.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
