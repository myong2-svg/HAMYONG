import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const trips = await prisma.trip.findMany({
    orderBy: { date: "desc" },
    include: {
      _count: { select: { participants: true, expenses: true } },
      expenses: { select: { amount: true } },
    },
  });
  return NextResponse.json(trips);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const trip = await prisma.trip.create({
    data: {
      title: body.title,
      location: body.location,
      date: new Date(body.date),
      description: body.description || null,
      status: body.status ?? "planned",
    },
  });
  return NextResponse.json(trip, { status: 201 });
}
