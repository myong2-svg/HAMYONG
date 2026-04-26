import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULT_FEE = 30000;
const TARGET_YEAR = 2026;

export async function GET() {
  try {
    const now = new Date();

    const [
      totalMembers,
      activeMembers,
      totalFeeCollected,
      totalExpenses,
      bankExpenses,
      recentExpenses,
      upcomingTrips,
      memberNames,
      feeByYear,
      safeboxSetting,
      unpaidAmountSetting,
      accountBalanceSetting,
      paidFees2026,
      activeMembersWithJoin,
      memberOverrides,
      carryoverSettings,
    ] = await Promise.all([
      prisma.member.count(),
      prisma.member.count({ where: { active: true } }),
      prisma.fee.aggregate({
        where: { status: "paid" },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({ _sum: { amount: true } }),
      // 클럽 계좌에서 실제 출금된 지출만 (paidById IS NULL)
      prisma.expense.aggregate({
        where: { paidById: null },
        _sum: { amount: true },
      }),
      prisma.expense.findMany({
        take: 5,
        orderBy: { date: "desc" },
        include: { paidBy: true, trip: true },
      }),
      prisma.trip.findMany({
        where: { status: "planned", date: { gte: now } },
        orderBy: { date: "asc" },
        take: 3,
      }),
      prisma.member.findMany({
        where: { active: true },
        select: { name: true },
        orderBy: { name: "asc" },
      }),
      prisma.fee.findMany({
        where: { status: "paid" },
        select: { year: true, amount: true },
      }),
      prisma.setting.findUnique({ where: { key: "safebox" } }),
      prisma.setting.findUnique({ where: { key: "unpaid_amount" } }),
      // 수동 입력 통장잔액
      prisma.setting.findUnique({ where: { key: "account_balance" } }),
      // TARGET_YEAR 납부 기록
      prisma.fee.findMany({
        where: { status: "paid", year: TARGET_YEAR },
        select: { memberId: true, year: true, month: true },
      }),
      // 활성 회원 + 가입일
      prisma.member.findMany({
        where: { active: true },
        select: { id: true, name: true, joinDate: true },
        orderBy: { name: "asc" },
      }),
      // 미납자 개별 금액 override (설정에 저장된 값)
      prisma.setting.findMany({
        where: { key: { startsWith: "unpaid_mid_" } },
      }),
      // 이전연도 이월미납금 (설정에 저장된 값)
      prisma.setting.findMany({
        where: { key: { startsWith: "carryover_mid_" } },
      }),
    ]);

    // TARGET_YEAR 전체 12개월 기준으로 미납 계산
    const allMonths: { year: number; month: number }[] = [];
    for (let m = 1; m <= 12; m++) {
      allMonths.push({ year: TARGET_YEAR, month: m });
    }

    // 미납자 개별 override 맵 (memberId → override amount)
    const overrideMap = new Map<number, number>(
      (memberOverrides as { key: string; value: string }[])
        .filter(s => s.value !== null && s.value !== "")
        .map(s => [
          parseInt(s.key.replace("unpaid_mid_", "")),
          parseInt(s.value),
        ])
    );

    // 이전연도 이월미납금 맵 (memberId → carryover amount)
    const carryoverMap = new Map<number, number>(
      (carryoverSettings as { key: string; value: string }[])
        .filter(s => s.value !== null && s.value !== "")
        .map(s => [
          parseInt(s.key.replace("carryover_mid_", "")),
          parseInt(s.value) || 0,
        ])
    );

    // 2026년 미납 계산
    const paidSet = new Set(
      (paidFees2026 as { memberId: number; year: number; month: number }[])
        .map(f => `${f.memberId}-${f.year}-${f.month}`)
    );

    type UnpaidEntry = { memberId: number; name: string; months: number; amount: number; isManual: boolean; carryover: number };
    const unpaidMap = new Map<number, UnpaidEntry>();

    for (const { year, month } of allMonths) {
      for (const member of activeMembersWithJoin as { id: number; name: string; joinDate: Date }[]) {
        const jd = new Date(member.joinDate);
        const jy = jd.getFullYear();
        const jm = jd.getMonth() + 1;
        if (year < jy || (year === jy && month < jm)) continue;

        if (!paidSet.has(`${member.id}-${year}-${month}`)) {
          const entry = unpaidMap.get(member.id);
          if (entry) {
            entry.months++;
          } else {
            unpaidMap.set(member.id, { memberId: member.id, name: member.name, months: 1, amount: 0, isManual: false, carryover: carryoverMap.get(member.id) ?? 0 });
          }
        }
      }
    }

    // override 없으면 months × DEFAULT_FEE, 있으면 override 금액. 이월미납금 합산.
    for (const [memberId, entry] of unpaidMap.entries()) {
      const base = overrideMap.has(memberId)
        ? (entry.isManual = true, overrideMap.get(memberId)!)
        : entry.months * DEFAULT_FEE;
      entry.amount = base + entry.carryover;
    }

    // 이월미납만 있고 2026 미납은 없는 회원 추가
    for (const member of activeMembersWithJoin as { id: number; name: string; joinDate: Date }[]) {
      if (!unpaidMap.has(member.id) && carryoverMap.has(member.id) && (carryoverMap.get(member.id)! > 0)) {
        unpaidMap.set(member.id, {
          memberId: member.id, name: member.name, months: 0,
          amount: carryoverMap.get(member.id)!, isManual: false,
          carryover: carryoverMap.get(member.id)!,
        });
      }
    }

    const unpaidMembers = [...unpaidMap.values()]
      .filter(e => e.amount > 0)
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));

    const totalFee = totalFeeCollected._sum.amount ?? 0;
    const totalExp = totalExpenses._sum.amount ?? 0;
    const bankExp = bankExpenses._sum.amount ?? 0;
    const safebox = parseInt(safeboxSetting?.value ?? "0") || 0;

    // 수동 입력 통장잔액이 있으면 그 값 사용, 없으면 자동 계산
    const manualAccountBalance = parseInt(accountBalanceSetting?.value ?? "0") || 0;
    const calcAccountBalance = totalFee - bankExp - safebox;
    const accountBalance = manualAccountBalance !== 0 ? manualAccountBalance : calcAccountBalance;
    const accountBalanceIsManual = manualAccountBalance !== 0;

    const balance = safebox + accountBalance;
    // 수동 설정값이 있으면 사용, 없으면 개별 미납금액 합산으로 자동 계산
    const manualTotalUnpaid = parseInt(unpaidAmountSetting?.value ?? "0") || 0;
    const calcTotalUnpaid = unpaidMembers.reduce((s, m) => s + m.amount, 0);
    const totalUnpaidAmount = manualTotalUnpaid !== 0 ? manualTotalUnpaid : calcTotalUnpaid;

    return NextResponse.json({
      totalMembers,
      activeMembers,
      totalFeeCollected: totalFee,
      totalExpenses: totalExp,
      balance,
      safebox,
      accountBalance,
      accountBalanceIsManual,
      unpaidCount: unpaidMembers.length,
      unpaidMembers,
      totalUnpaidAmount,
      memberNames: memberNames.map((m: { name: string }) => m.name),
      feeByYear: Object.entries(
        (feeByYear as { year: number; amount: number }[]).reduce<Record<number, number>>((acc, r) => {
          acc[r.year] = (acc[r.year] ?? 0) + r.amount;
          return acc;
        }, {})
      ).map(([year, amount]) => ({ year: Number(year), amount })).sort((a, b) => a.year - b.year),
      recentExpenses,
      upcomingTrips,
    });
  } catch (e) {
    console.error("[dashboard]", e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
