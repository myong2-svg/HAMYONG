import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

const MONTHLY_FEE = 30000;
const SKIP_NAMES = new Set(["찬조", "지출", "은행이자", "세이프박스", "잔액", "총액", "합계", ""]);

function isSkipRow(name: string) {
  return SKIP_NAMES.has(name.trim()) || /^(지출|이자|잔액|총액|합계)/.test(name.trim());
}

function parseMonthHeader(h: unknown): number | null {
  const m = String(h ?? "").match(/^(\d{1,2})월$/);
  return m ? parseInt(m[1]) : null;
}

function parseFeeAmount(val: unknown): number {
  if (typeof val === "number") return val;
  const s = String(val ?? "").trim();
  if (!s) return 0;
  if (["납부", "O", "o", "✓", "Y", "y", "v", "V"].includes(s)) return MONTHLY_FEE;
  return parseInt(s.replace(/[^0-9]/g, "")) || 0;
}

// 시트 이름에서 연도 추출: "2024", "2024년", "2024년도", "24년", "24년도"
function extractYear(sheetName: string): number | null {
  const full = sheetName.trim().match(/^(20\d{2})\s*(년\s*도?)?$/);
  if (full) return parseInt(full[1]);
  const short = sheetName.trim().match(/^(\d{2})\s*년\s*도?$/);
  if (short) return 2000 + parseInt(short[1]);
  return null;
}

// 시트 이름에서 낚시 일정 날짜 추출
// 지원: "24.08.30", "24.08.30갈치", "2024.08.30갈치", "240830갈치", "24-08-30갈치"
function extractTripDate(sheetName: string): Date | null {
  let m = sheetName.match(/^(\d{2})\.(\d{2})\.(\d{2})/);
  if (m) return new Date(2000 + parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  m = sheetName.match(/^(20\d{2})\.(\d{2})\.(\d{2})/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  m = sheetName.match(/^(\d{2})-(\d{2})-(\d{2})/);
  if (m) return new Date(2000 + parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  // 6자리 연속 숫자 (YYMMDD)
  m = sheetName.match(/^(\d{2})(\d{2})(\d{2})([^\d]|$)/);
  if (m) return new Date(2000 + parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
  return null;
}

interface ParsedFee {
  memberName: string;
  year: number;
  month: number;
  amount: number;
  status: "paid" | "unpaid";
}

function parseClubSheet(
  ws: XLSX.WorkSheet,
  year: number
): { members: string[]; fees: ParsedFee[] } {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

  // 헤더 행 찾기 - "성명" 또는 "이름" 컬럼 포함된 행 (최대 10행 탐색)
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(10, raw.length); i++) {
    const row = raw[i] as unknown[];
    if (row.some((c) => String(c).includes("성명") || String(c).includes("이름"))) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) return { members: [], fees: [] };

  const headerRow = raw[headerRowIdx] as unknown[];

  // 이름 컬럼 인덱스 찾기
  const nameColIdx = headerRow.findIndex(
    (h) => String(h).includes("성명") || String(h).includes("이름")
  );
  const numColIdx = nameColIdx > 0 ? nameColIdx - 1 : 0;

  // 월 컬럼 인덱스 맵 { colIdx → month }
  const monthCols = new Map<number, number>();
  headerRow.forEach((h, idx) => {
    const m = parseMonthHeader(h);
    if (m) monthCols.set(idx, m);
  });

  const noteColIdx = headerRow.findIndex((h) => String(h).includes("비고"));

  const members: string[] = [];
  const fees: ParsedFee[] = [];

  for (let ri = headerRowIdx + 1; ri < raw.length; ri++) {
    const row = raw[ri] as unknown[];
    const numCell = row[numColIdx];
    const nameCell = String(row[nameColIdx] ?? "").trim();

    if (!nameCell || isSkipRow(nameCell)) continue;
    if (typeof numCell !== "number" && !/^\d+$/.test(String(numCell))) continue;

    if (noteColIdx >= 0) {
      const note = String(row[noteColIdx] ?? "").trim();
      if (note.includes("탈퇴")) continue;
    }

    if (!members.includes(nameCell)) members.push(nameCell);

    monthCols.forEach((month, colIdx) => {
      const val = row[colIdx];
      const amount = parseFeeAmount(val);

      if (amount > 0) {
        const months = Math.round(amount / MONTHLY_FEE);
        for (let mo = 0; mo < months; mo++) {
          let targetMonth = month + mo;
          let targetYear = year;
          if (targetMonth > 12) {
            targetMonth -= 12;
            targetYear += 1;
          }
          fees.push({
            memberName: nameCell,
            year: targetYear,
            month: targetMonth,
            amount: MONTHLY_FEE,
            status: "paid",
          });
        }
      }
    });
  }

  return { members, fees };
}

function parseTripSheet(ws: XLSX.WorkSheet, sheetName: string, date: Date) {
  const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

  // 제목: 첫 번째 비어있지 않은 행의 첫 셀
  let title = sheetName;
  for (const row of raw as unknown[][]) {
    const c0 = String((row as unknown[])[0] ?? "").trim();
    // Skip short names (≤4 chars) that are likely member names, not trip titles
    if (c0 && c0.length > 4 && c0.length < 40) { title = c0; break; }
  }

  const participants: string[] = [];
  const expenses: { title: string; amount: number }[] = [];
  const SKIP_CELLS = new Set(["회비", "잔금", "조식", "찬조", "총금액", "합계", "소계", "잔액"]);

  for (const rawRow of raw as unknown[][]) {
    const row = rawRow as unknown[];
    const c0 = String(row[0] ?? "").trim();
    const c1 = String(row[1] ?? "").trim();

    if (!c0) continue;

    // 숫자로 시작하거나 스킵 대상이면 건너뜀
    if (SKIP_CELLS.has(c0)) continue;

    // 숫자형 셀만 금액으로 인정 (텍스트 파싱 제외 - "사이다캔 12ea" 같은 오탐 방지)
    const amounts = (row as unknown[])
      .map((v) => (typeof v === "number" ? v : 0))
      .filter((v) => v > 0 && v < 100_000_000);
    const rowAmount = amounts[0] ?? 0;

    // 금액이 없으면 참가자 이름 행
    if (rowAmount === 0) {
      if (c0.length >= 2 && c0.length <= 10 && !c0.match(/^\d/) && !participants.includes(c0)) {
        participants.push(c0);
      }
      continue;
    }

    // 금액이 있으면 지출 항목
    const expenseTitle = c0 || c1;
    if (expenseTitle && !expenseTitle.match(/^\d/)) {
      expenses.push({ title: expenseTitle, amount: rowAmount });
    }
  }

  return { title, date, participants, expenses };
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });

  const result = {
    members: 0,
    fees: 0,
    trips: 0,
    skipped: 0,
    errors: [] as string[],
    debug: [] as string[],
  };

  result.debug.push(`시트목록: ${wb.SheetNames.join(", ")}`);
  console.log("[import/club] 시트목록:", wb.SheetNames);

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const year = extractYear(sheetName);
    const tripDate = extractTripDate(sheetName);

    if (year !== null) {
      // 연도 시트: 회원 + 회비
      const { members, fees } = parseClubSheet(ws, year);
      result.debug.push(`${sheetName}: 회원=${members.length}, 회비=${fees.length}`);
      console.log(`[import/club] ${sheetName}: 회원=${members.length}, 회비=${fees.length}`);

      for (const name of members) {
        try {
          const existing = await prisma.member.findFirst({ where: { name } });
          if (!existing) {
            await prisma.member.create({ data: { name } });
            result.members++;
          }
        } catch (e: unknown) {
          result.errors.push(`회원 ${name}: ${(e as Error).message}`);
        }
      }

      const allMembers = await prisma.member.findMany({ select: { id: true, name: true } });
      const memberMap = new Map(allMembers.map((m) => [m.name, m.id]));

      for (const fee of fees) {
        const memberId = memberMap.get(fee.memberName);
        if (!memberId) { result.skipped++; continue; }
        try {
          const existing = await prisma.fee.findFirst({
            where: { memberId, year: fee.year, month: fee.month },
          });
          if (!existing) {
            await prisma.fee.create({
              data: {
                memberId,
                amount: fee.amount,
                year: fee.year,
                month: fee.month,
                status: fee.status,
                paidAt: fee.status === "paid" ? new Date() : null,
              },
            });
            result.fees++;
          }
        } catch (e: unknown) {
          result.errors.push(`회비 ${fee.memberName} ${fee.year}/${fee.month}: ${(e as Error).message}`);
        }
      }
    } else if (tripDate !== null) {
      // 낚시 일정 시트
      const { title, date, participants, expenses } = parseTripSheet(ws, sheetName, tripDate);

      try {
        const existing = await prisma.trip.findFirst({ where: { title } });
        let tripId: number;
        if (!existing) {
          const trip = await prisma.trip.create({
            data: { title, location: title, date, status: "completed" },
          });
          tripId = trip.id;
          result.trips++;
        } else {
          tripId = existing.id;
        }

        const allMembers = await prisma.member.findMany({ select: { id: true, name: true } });
        const memberMap = new Map(allMembers.map((m) => [m.name, m.id]));

        for (const name of participants) {
          const memberId = memberMap.get(name);
          if (!memberId) continue;
          await prisma.tripParticipant.upsert({
            where: { tripId_memberId: { tripId, memberId } },
            update: {},
            create: { tripId, memberId },
          });
        }

        for (const exp of expenses) {
          if (!exp.title || !exp.amount) continue;
          const exists = await prisma.expense.findFirst({
            where: { title: exp.title, tripId },
          });
          if (!exists) {
            await prisma.expense.create({
              data: { title: exp.title, amount: exp.amount, category: "기타", date, tripId },
            });
          }
        }
      } catch (e: unknown) {
        result.errors.push(`일정 ${sheetName}: ${(e as Error).message}`);
      }
    }
    // 인식 못한 시트는 조용히 스킵
  }

  return NextResponse.json(result);
}

// 미리보기
export async function PUT(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });

  const preview: Record<string, unknown>[] = [];

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const year = extractYear(sheetName);
    const tripDate = extractTripDate(sheetName);

    if (year !== null) {
      const { members, fees } = parseClubSheet(ws, year);
      preview.push({
        sheet: sheetName,
        type: "회비",
        members: members.length,
        feeRecords: fees.length,
        memberList: members,
      });
    } else if (tripDate !== null) {
      const { title, participants } = parseTripSheet(ws, sheetName, tripDate);
      preview.push({
        sheet: sheetName,
        type: "낚시일정",
        title,
        date: tripDate.toISOString(),
        participants,
      });
    } else {
      // 인식 못한 시트: 첫 3행 내용 보여주기 (디버그용)
      const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
      const firstRow = (raw[0] as unknown[] | undefined)?.map(String) ?? [];
      preview.push({
        sheet: sheetName,
        type: "미인식",
        skip: true,
        headers: firstRow,
        hint: `시트 이름이 연도(예: 2024, 2024년)나 날짜(예: 24.08.30) 형식이어야 합니다.`,
      });
    }
  }

  return NextResponse.json({ preview });
}
