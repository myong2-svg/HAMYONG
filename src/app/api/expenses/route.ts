import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tripId = searchParams.get("tripId");
  const category = searchParams.get("category");

  const expenses = await prisma.expense.findMany({
    where: {
      ...(tripId && { tripId: Number(tripId) }),
      ...(category && { category }),
    },
    include: { paidBy: true, trip: true },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const expense = await prisma.expense.create({
    data: {
      title: body.title,
      amount: Number(body.amount),
      category: body.category,
      date: new Date(body.date),
      description: body.description || null,
      paidById: body.paidById ? Number(body.paidById) : null,
      tripId: body.tripId ? Number(body.tripId) : null,
    },
    include: { paidBy: true, trip: true },
  });
  return NextResponse.json(expense, { status: 201 });
}
