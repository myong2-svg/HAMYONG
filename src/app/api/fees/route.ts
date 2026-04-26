import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_FEE = 30000;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  const fees = await prisma.fee.findMany({
    where: {
      ...(year && { year: Number(year) }),
      ...(month && { month: Number(month) }),
    },
    include: { member: true },
    orderBy: [{ year: "desc" }, { month: "desc" }, { member: { name: "asc" } }],
  });

  // 특정 월 조회 시 활성 회원 전체를 기준으로, 기록 없는 회원은 가상 미납 항목으로 채움
  if (year && month) {
    const activeMembers = await prisma.member.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    const existingMemberIds = new Set(fees.map((f) => f.memberId));
    const virtualFees = activeMembers
      .filter((m) => !existingMemberIds.has(m.id))
      .map((m) => ({
        id: null as null,
        memberId: m.id,
        amount: DEFAULT_FEE,
        year: Number(year),
        month: Number(month),
        status: "unpaid" as const,
        paidAt: null,
        note: null,
        createdAt: new Date(),
        member: m,
      }));

    const merged = [...fees, ...virtualFees].sort((a, b) =>
      a.member.name.localeCompare(b.member.name, "ko")
    );
    return NextResponse.json(merged);
  }

  return NextResponse.json(fees);
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  if (body.bulkCreate) {
    const members = await prisma.member.findMany({ where: { active: true } });
    const existing = await prisma.fee.findMany({
      where: { year: body.year, month: body.month },
      select: { memberId: true },
    });
    const existingIds = new Set(existing.map((f) => f.memberId));
    const toCreate = members
      .filter((m) => !existingIds.has(m.id))
      .map((m) => ({
        memberId: m.id,
        amount: body.amount,
        year: body.year,
        month: body.month,
        status: "unpaid",
      }));
    await prisma.fee.createMany({ data: toCreate });
    return NextResponse.json({ created: toCreate.length });
  }

  const fee = await prisma.fee.create({
    data: {
      memberId: body.memberId,
      amount: body.amount,
      year: body.year,
      month: body.month,
      status: body.status ?? "unpaid",
      note: body.note || null,
    },
  });
  return NextResponse.json(fee, { status: 201 });
}
