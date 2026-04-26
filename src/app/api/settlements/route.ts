import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tripId = searchParams.get("tripId");

  if (tripId) {
    const trip = await prisma.trip.findUnique({
      where: { id: Number(tripId) },
      include: {
        participants: { include: { member: true } },
        expenses: { include: { paidBy: true } },
      },
    });
    if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const totalExpense = trip.expenses.reduce((s, e) => s + e.amount, 0);
    const participantCount = trip.participants.length;
    const perPerson = participantCount > 0 ? Math.ceil(totalExpense / participantCount) : 0;

    const paidByMember: Record<number, number> = {};
    for (const exp of trip.expenses) {
      if (exp.paidById) {
        paidByMember[exp.paidById] = (paidByMember[exp.paidById] ?? 0) + exp.amount;
      }
    }

    const balances = trip.participants.map((p) => {
      const paid = paidByMember[p.memberId] ?? 0;
      const balance = paid - perPerson;
      return {
        memberId: p.memberId,
        memberName: p.member.name,
        paid,
        shouldPay: perPerson,
        balance,
      };
    });

    const transfers: Array<{ from: string; to: string; amount: number }> = [];
    const debtors = balances.filter((b) => b.balance < 0).map((b) => ({ ...b, remaining: -b.balance }));
    const creditors = balances.filter((b) => b.balance > 0).map((b) => ({ ...b, remaining: b.balance }));

    let di = 0, ci = 0;
    while (di < debtors.length && ci < creditors.length) {
      const amount = Math.min(debtors[di].remaining, creditors[ci].remaining);
      if (amount > 0) {
        transfers.push({ from: debtors[di].memberName, to: creditors[ci].memberName, amount });
      }
      debtors[di].remaining -= amount;
      creditors[ci].remaining -= amount;
      if (debtors[di].remaining === 0) di++;
      if (creditors[ci].remaining === 0) ci++;
    }

    return NextResponse.json({ trip, totalExpense, perPerson, balances, transfers });
  }

  const trips = await prisma.trip.findMany({
    where: { status: "completed" },
    include: {
      expenses: { select: { amount: true } },
      _count: { select: { participants: true } },
    },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(trips);
}
