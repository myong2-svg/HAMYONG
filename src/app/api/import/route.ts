import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

// ─── 열 이름 정규화 ────────────────────────────────────────────────────────────
function normalize(s: unknown): string {
  return String(s ?? "").trim().toLowerCase().replace(/\s+/g, "");
}

function parseDate(v: unknown): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  const n = Number(v);
  if (!isNaN(n) && n > 1000) {
    // Excel serial date
    const d = XLSX.SSF.parse_date_code(n);
    return new Date(d.y, d.m - 1, d.d);
  }
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d;
}

function parseAmount(v: unknown): number {
  return Math.round(Number(String(v ?? "0").replace(/[^0-9.-]/g, "")) || 0);
}

// ─── 멤버 행 파싱 ────────────────────────────────────────────────────────────
function parseMemberRow(row: Record<string, unknown>) {
  const keys = Object.keys(row);
  const get = (aliases: string[]) => {
    const k = keys.find((k) => aliases.includes(normalize(k)));
    return k ? String(row[k] ?? "").trim() : "";
  };

  return {
    name: get(["이름", "name", "성명"]),
    phone: get(["연락처", "phone", "휴대폰", "전화번호", "핸드폰", "번호"]),
    email: get(["이메일", "email", "mail"]),
    address: get(["주소", "address", "거주지"]),
    birthDate: get(["생년월일", "birth", "birthday", "생일"]),
    bankInfo: get(["계좌번호", "계좌", "bankinfo", "bank", "계좌정보"]),
    note: get(["비고", "메모", "note", "remark"]),
    role: get(["역할", "role", "직책"]) === "관리자" ? "admin" : "member",
    joinDate: get(["가입일", "joindate", "입회일", "가입날짜"]),
  };
}

// ─── 회비 행 파싱 ────────────────────────────────────────────────────────────
function parseFeeRow(row: Record<string, unknown>) {
  const keys = Object.keys(row);
  const get = (aliases: string[]) => {
    const k = keys.find((k) => aliases.includes(normalize(k)));
    return k !== undefined ? row[k] ?? "" : "";
  };
  const str = (aliases: string[]) => String(get(aliases)).trim();

  return {
    memberName: str(["이름", "name", "성명", "회원", "회원명"]),
    amount: parseAmount(get(["금액", "amount", "회비", "납부금액"])),
    year: parseInt(str(["년도", "year", "연도"]) || String(new Date().getFullYear())),
    month: parseInt(str(["월", "month"]) || String(new Date().getMonth() + 1)),
    status: ["납부", "완료", "paid", "y", "예"].includes(
      str(["납부여부", "status", "납부", "유무"]).toLowerCase()
    ) ? "paid" : "unpaid",
    paidAt: parseDate(get(["납부일", "paidat", "납부날짜"])),
    note: str(["비고", "메모", "note"]),
  };
}

// ─── 지출 행 파싱 ────────────────────────────────────────────────────────────
const CATEGORY_MAP: Record<string, string> = {
  낚시터: "낚시터", 낚시장: "낚시터", 입장료: "낚시터",
  식비: "식비", 식사: "식비", 음식: "식비", 밥: "식비",
  장비: "장비", 도구: "장비", 용품: "장비",
  교통: "교통", 유류: "교통", 주유: "교통", 기름: "교통",
};
function detectCategory(raw: string): string {
  for (const [k, v] of Object.entries(CATEGORY_MAP)) {
    if (raw.includes(k)) return v;
  }
  return "기타";
}

function parseExpenseRow(row: Record<string, unknown>) {
  const keys = Object.keys(row);
  const get = (aliases: string[]) => {
    const k = keys.find((k) => aliases.includes(normalize(k)));
    return k !== undefined ? row[k] ?? "" : "";
  };
  const str = (aliases: string[]) => String(get(aliases)).trim();

  const rawCategory = str(["카테고리", "category", "분류", "항목구분"]);
  return {
    title: str(["항목", "title", "내용", "지출항목", "내역", "항목명"]),
    amount: parseAmount(get(["금액", "amount", "지출금액", "비용"])),
    category: CATEGORY_MAP[rawCategory] ?? detectCategory(rawCategory) ?? "기타",
    date: parseDate(get(["날짜", "date", "지출일", "일자"])) ?? new Date(),
    description: str(["설명", "description", "비고", "메모"]),
    paidByName: str(["결제자", "paidby", "결제한사람", "지불자"]),
  };
}

// ─── 메인 핸들러 ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const type = formData.get("type") as string; // members | fees | expenses | auto

  if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const results = { members: 0, fees: 0, expenses: 0, skipped: 0, errors: [] as string[] };

  // 시트 선택
  const targetSheets =
    type === "auto"
      ? wb.SheetNames
      : wb.SheetNames.filter((n) => {
          const ln = n.toLowerCase();
          if (type === "members") return ln.includes("회원") || ln.includes("member") || wb.SheetNames.length === 1;
          if (type === "fees") return ln.includes("회비") || ln.includes("fee") || wb.SheetNames.length === 1;
          if (type === "expenses") return ln.includes("지출") || ln.includes("expense") || wb.SheetNames.length === 1;
          return true;
        });

  for (const sheetName of targetSheets) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    if (rows.length === 0) continue;

    const ln = sheetName.toLowerCase();
    const isMembers = type === "members" || (type === "auto" && (ln.includes("회원") || ln.includes("member")));
    const isFees = type === "fees" || (type === "auto" && (ln.includes("회비") || ln.includes("fee")));
    const isExpenses = type === "expenses" || (type === "auto" && (ln.includes("지출") || ln.includes("expense")));

    // 자동 감지: 첫 행 헤더 보고 판단
    const firstKeys = Object.keys(rows[0]).map(normalize);
    const looksLikeMember = firstKeys.some((k) => ["이름", "주소", "연락처", "name"].includes(k));
    const looksLikeFee = firstKeys.some((k) => ["회비", "납부", "fee", "월"].includes(k));
    const looksLikeExpense = firstKeys.some((k) => ["지출", "항목", "카테고리", "expense"].includes(k));

    const effectiveType =
      isMembers || (type === "auto" && looksLikeMember && !looksLikeFee && !looksLikeExpense)
        ? "members"
        : isFees || (type === "auto" && looksLikeFee)
        ? "fees"
        : isExpenses || (type === "auto" && looksLikeExpense)
        ? "expenses"
        : "members"; // 기본값

    if (effectiveType === "members") {
      for (const row of rows) {
        const m = parseMemberRow(row);
        if (!m.name) { results.skipped++; continue; }
        try {
          await prisma.member.upsert({
            where: { id: -1 }, // always create
            update: {},
            create: {
              name: m.name,
              phone: m.phone || null,
              email: m.email || null,
              address: m.address || null,
              birthDate: m.birthDate || null,
              bankInfo: m.bankInfo || null,
              note: m.note || null,
              role: m.role,
              joinDate: m.joinDate ? new Date(m.joinDate) : new Date(),
            },
          });
          results.members++;
        } catch {
          // upsert with id:-1 will always go to create
          await prisma.member.create({
            data: {
              name: m.name,
              phone: m.phone || null,
              email: m.email || null,
              address: m.address || null,
              birthDate: m.birthDate || null,
              bankInfo: m.bankInfo || null,
              note: m.note || null,
              role: m.role,
              joinDate: m.joinDate ? new Date(m.joinDate) : new Date(),
            },
          }).then(() => results.members++).catch((e: Error) => results.errors.push(`회원 ${m.name}: ${e.message}`));
        }
      }
    } else if (effectiveType === "fees") {
      const members = await prisma.member.findMany({ select: { id: true, name: true } });
      const memberMap = new Map(members.map((m) => [m.name, m.id]));

      for (const row of rows) {
        const f = parseFeeRow(row);
        if (!f.memberName || !f.year || !f.month) { results.skipped++; continue; }
        const memberId = memberMap.get(f.memberName);
        if (!memberId) { results.errors.push(`회원 미발견: ${f.memberName}`); continue; }
        try {
          const existing = await prisma.fee.findFirst({ where: { memberId, year: f.year, month: f.month } });
          if (existing) {
            await prisma.fee.update({
              where: { id: existing.id },
              data: { status: f.status, paidAt: f.status === "paid" ? (f.paidAt ?? new Date()) : null, amount: f.amount || existing.amount, note: f.note || null },
            });
          } else {
            await prisma.fee.create({
              data: { memberId, amount: f.amount || 30000, year: f.year, month: f.month, status: f.status, paidAt: f.status === "paid" ? (f.paidAt ?? new Date()) : null, note: f.note || null },
            });
          }
          results.fees++;
        } catch (e: unknown) {
          results.errors.push(`회비 ${f.memberName} ${f.year}/${f.month}: ${(e as Error).message}`);
        }
      }
    } else if (effectiveType === "expenses") {
      const members = await prisma.member.findMany({ select: { id: true, name: true } });
      const memberMap = new Map(members.map((m) => [m.name, m.id]));

      for (const row of rows) {
        const e = parseExpenseRow(row);
        if (!e.title || !e.amount) { results.skipped++; continue; }
        try {
          await prisma.expense.create({
            data: {
              title: e.title,
              amount: e.amount,
              category: e.category,
              date: e.date,
              description: e.description || null,
              paidById: e.paidByName ? (memberMap.get(e.paidByName) ?? null) : null,
            },
          });
          results.expenses++;
        } catch (err: unknown) {
          results.errors.push(`지출 ${e.title}: ${(err as Error).message}`);
        }
      }
    }
  }

  return NextResponse.json(results);
}

// 미리보기: 파일 구조 반환
export async function PUT(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer", cellDates: true });

  const preview = wb.SheetNames.map((name) => {
    const ws = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
    return {
      sheet: name,
      totalRows: rows.length,
      headers: rows.length > 0 ? Object.keys(rows[0]) : [],
      sample: rows.slice(0, 3),
    };
  });

  return NextResponse.json({ sheets: preview });
}
