import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const XlsxPopulate = require("xlsx-populate");

async function decryptBuffer(buffer: Buffer, password: string): Promise<Buffer> {
  const workbook = await XlsxPopulate.fromDataAsync(buffer, { password });
  const output = await workbook.outputAsync();
  return Buffer.from(output);
}

const DATE_ALIASES = ["거래일시", "거래일", "날짜", "일시"];
const TYPE_ALIASES = ["거래구분", "구분", "입출금구분"];
const AMOUNT_ALIASES = ["거래금액", "금액", "거래액"];
const MEMO_ALIASES = ["내용", "메모", "거래내용", "적요"];
const COUNTERPARTY_ALIASES = ["거래처", "상대방", "보낸분/받는분", "입금자"];
const SKIP_TX_TYPES = ["세이프박스", "예금이자", "캐시백"];

function parseKakaoDate(v: unknown): Date {
  if (v instanceof Date) return v;
  const s = String(v ?? "");
  const n = Number(v);
  if (!isNaN(n) && n > 40000) {
    const d = XLSX.SSF.parse_date_code(n);
    return new Date(d.y, d.m - 1, d.d);
  }
  const d = new Date(s.replace(/\./g, "-").replace(" ", "T"));
  return isNaN(d.getTime()) ? new Date() : d;
}

function matchMember(memo: string, extra: string, memberNames: string[]): string | null {
  const combined = `${memo} ${extra}`;
  for (const name of memberNames) {
    if (combined.includes(name)) return name;
    if (name.length >= 3 && combined.includes(name.slice(0, 2))) return name;
  }
  return null;
}

function guessCategory(memo: string): string {
  const m = memo.toLowerCase();
  if (/낚시|피싱|해광|통영|포항|거제|여수|낚싯/.test(m)) return "낚시터";
  if (/식당|마트|편의|카페|커피|족발|치킨|피자|밥|음식|먹/.test(m)) return "식비";
  if (/주유|기름|sk|gs칼|현대오일|셀프|유류/.test(m)) return "교통";
  if (/낚싯대|릴|태클|미끼|채비|루어|찌/.test(m)) return "장비";
  return "기타";
}

async function readWorkbook(buffer: Buffer, password: string | null): Promise<XLSX.WorkBook> {
  if (password) {
    const decrypted = await decryptBuffer(buffer, password);
    return XLSX.read(decrypted, { type: "buffer", cellDates: true });
  }
  return XLSX.read(buffer, { type: "buffer", cellDates: true });
}

// KakaoBank exports have metadata rows before the actual data header.
// Scan up to 20 rows to find the header row containing a date column name.
function findHeaderRow(raw: unknown[][]): number {
  for (let i = 0; i < Math.min(20, raw.length); i++) {
    const row = raw[i];
    if (DATE_ALIASES.some((a) => row.some((c) => String(c) === a))) return i;
  }
  return -1;
}

function findColIdx(headerRow: string[], aliases: string[]): number {
  return headerRow.findIndex((h) => aliases.some((a) => h.includes(a)));
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const password = formData.get("password") as string | null;
  const mode = (formData.get("mode") as string) || "auto";

  if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  let wb: XLSX.WorkBook;
  try {
    wb = await readWorkbook(buffer, password);
  } catch {
    return NextResponse.json(
      { error: password ? "비밀번호가 틀렸거나 파일이 손상됐습니다." : "파일을 열 수 없습니다. 비밀번호가 필요할 수 있습니다." },
      { status: 400 }
    );
  }

  const allMembers = await prisma.member.findMany({ select: { id: true, name: true, joinDate: true } });
  const memberMap = new Map(allMembers.map((m) => [m.name, m.id]));
  const memberJoinMap = new Map(allMembers.map((m) => [m.id, new Date(m.joinDate)]));
  const memberNames = allMembers.map((m) => m.name);

  const result = { fees: 0, expenses: 0, skipped: 0, errors: [] as string[] };

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
    if (raw.length === 0) continue;

    const headerRowIdx = findHeaderRow(raw);
    if (headerRowIdx === -1) continue;

    const headerRow = (raw[headerRowIdx] as unknown[]).map(String);
    const dIdx = findColIdx(headerRow, DATE_ALIASES);
    const tIdx = findColIdx(headerRow, TYPE_ALIASES);
    const aIdx = findColIdx(headerRow, AMOUNT_ALIASES);
    const mIdx = findColIdx(headerRow, MEMO_ALIASES);
    const cIdx = findColIdx(headerRow, COUNTERPARTY_ALIASES);
    // "거래구분" exact match for skip categories (세이프박스/예금이자 etc.)
    const txCatIdx = headerRow.findIndex((h) => h === "거래구분");
    // "메모" column often has sender name in KakaoBank format
    const memoIdx2 = headerRow.indexOf("메모");

    console.log(`[kakaobank] ${sheetName} header@${headerRowIdx}: date=${dIdx} type=${tIdx} amount=${aIdx} memo=${mIdx} txCat=${txCatIdx}`);

    for (let ri = headerRowIdx + 1; ri < raw.length; ri++) {
      const row = raw[ri] as unknown[];

      const txCat = txCatIdx >= 0 ? String(row[txCatIdx] ?? "").trim() : "";
      if (SKIP_TX_TYPES.some((t) => txCat.includes(t))) { result.skipped++; continue; }

      const rawAmount = aIdx >= 0 ? String(row[aIdx] ?? "").replace(/[^0-9]/g, "") : "";
      const amount = parseInt(rawAmount) || 0;
      if (!amount) { result.skipped++; continue; }

      const txType = tIdx >= 0 ? String(row[tIdx] ?? "").trim() : "";
      const memo = mIdx >= 0 ? String(row[mIdx] ?? "").trim() : "";
      const memoExtra = (memoIdx2 >= 0 && memoIdx2 !== mIdx) ? String(row[memoIdx2] ?? "").trim() : "";
      const counterparty = cIdx >= 0 ? String(row[cIdx] ?? "").trim() : memoExtra;
      const date = parseKakaoDate(dIdx >= 0 ? row[dIdx] : "");

      const isDeposit = txType.includes("입금") || txType === "IN";
      const isWithdraw = txType.includes("출금") || txType === "OUT";

      const treatAsFee = mode === "fee" || (mode === "auto" && isDeposit);
      const treatAsExpense = mode === "expense" || (mode === "auto" && isWithdraw);

      if (treatAsFee && isDeposit) {
        const matchedName = matchMember(memo, counterparty || memoExtra, memberNames);
        const memberId = matchedName ? memberMap.get(matchedName) : null;

        if (memberId) {
          const txYear = date.getFullYear();
          const txMonth = date.getMonth() + 1;

          // 가입일 기준 시작 월 결정
          const joinDate = memberJoinMap.get(memberId) ?? new Date(txYear, 0, 1);
          const startMonth = txYear === joinDate.getFullYear() ? joinDate.getMonth() + 1 : 1;

          // 이미 납부된 달 조회
          const paidFees = await prisma.fee.findMany({
            where: { memberId, year: txYear, status: "paid" },
            select: { month: true },
          });
          const paidMonthSet = new Set(paidFees.map((f) => f.month));

          // 가입월부터 입금월까지 가장 오래된 미납 달 찾기 (FIFO)
          let targetMonth: number | null = null;
          for (let m = startMonth; m <= txMonth; m++) {
            if (!paidMonthSet.has(m)) { targetMonth = m; break; }
          }

          if (targetMonth === null) {
            result.skipped++;
          } else {
            try {
              const existing = await prisma.fee.findFirst({ where: { memberId, year: txYear, month: targetMonth } });
              if (!existing) {
                await prisma.fee.create({
                  data: { memberId, amount, year: txYear, month: targetMonth, status: "paid", paidAt: date, note: memo },
                });
                result.fees++;
              } else if (existing.status === "unpaid") {
                await prisma.fee.update({
                  where: { id: existing.id },
                  data: { status: "paid", paidAt: date, note: memo },
                });
                result.fees++;
              } else {
                result.skipped++;
              }
            } catch (e: unknown) {
              result.errors.push(`회비 ${matchedName}: ${(e as Error).message}`);
            }
          }
        } else {
          result.skipped++;
        }
      } else if (treatAsExpense && isWithdraw) {
        const title = memo || counterparty || "출금";
        const category = guessCategory(memo + counterparty);
        try {
          await prisma.expense.create({
            data: { title, amount, category, date, description: counterparty || null },
          });
          result.expenses++;
        } catch (e: unknown) {
          result.errors.push(`지출 ${title}: ${(e as Error).message}`);
        }
      } else {
        result.skipped++;
      }
    }
  }

  return NextResponse.json(result);
}

export async function PUT(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const password = formData.get("password") as string | null;
  if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());

  let wb: XLSX.WorkBook;
  try {
    wb = await readWorkbook(buffer, password);
  } catch {
    return NextResponse.json(
      { error: password ? "비밀번호가 틀렸습니다." : "비밀번호가 필요합니다." },
      { status: 400 }
    );
  }

  const previews = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const raw = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
    const headerRowIdx = findHeaderRow(raw);
    if (headerRowIdx === -1) {
      return { sheet: name, totalRows: raw.length, headers: [], sample: [], hint: "헤더 행을 찾을 수 없습니다." };
    }
    const headerRow = (raw[headerRowIdx] as unknown[]).map(String);
    const dataRows = raw.slice(headerRowIdx + 1).filter((r) => (r as unknown[]).some((c) => c !== ""));
    const sample = dataRows.slice(0, 5).map((row) =>
      Object.fromEntries(headerRow.map((h, i) => [h, (row as unknown[])[i] ?? ""]))
    );
    return {
      sheet: name,
      totalRows: dataRows.length,
      headers: headerRow,
      sample,
    };
  });

  return NextResponse.json({ sheets: previews });
}
