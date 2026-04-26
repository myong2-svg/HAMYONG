import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "all"; // all | members | fees | expenses | trips

  const wb = XLSX.utils.book_new();

  if (type === "all" || type === "members") {
    const members = await prisma.member.findMany({ orderBy: { name: "asc" } });
    const rows = [
      ["이름", "연락처", "이메일", "주소", "생년월일", "계좌번호", "역할", "가입일", "비고"],
      ...members.map((m) => [
        m.name,
        m.phone ?? "",
        m.email ?? "",
        m.address ?? "",
        m.birthDate ?? "",
        m.bankInfo ?? "",
        m.role === "admin" ? "관리자" : "회원",
        m.joinDate ? new Date(m.joinDate).toLocaleDateString("ko-KR") : "",
        m.note ?? "",
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "회원명단");
  }

  if (type === "all" || type === "fees") {
    const fees = await prisma.fee.findMany({
      include: { member: { select: { name: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }, { member: { name: "asc" } }],
    });
    const rows = [
      ["이름", "연도", "월", "금액", "납부여부", "납부일", "비고"],
      ...fees.map((f) => [
        f.member.name,
        f.year,
        f.month,
        f.amount,
        f.status === "paid" ? "납부" : "미납",
        f.paidAt ? new Date(f.paidAt).toLocaleDateString("ko-KR") : "",
        f.note ?? "",
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "회비내역");
  }

  if (type === "all" || type === "expenses") {
    const expenses = await prisma.expense.findMany({
      include: {
        paidBy: { select: { name: true } },
        trip: { select: { title: true } },
      },
      orderBy: { date: "desc" },
    });
    const rows = [
      ["항목", "금액", "카테고리", "날짜", "결제자", "낚시일정", "설명"],
      ...expenses.map((e) => [
        e.title,
        e.amount,
        e.category,
        new Date(e.date).toLocaleDateString("ko-KR"),
        e.paidBy?.name ?? "",
        e.trip?.title ?? "",
        e.description ?? "",
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "지출내역");
  }

  if (type === "all" || type === "trips") {
    const trips = await prisma.trip.findMany({
      include: {
        participants: { include: { member: { select: { name: true } } } },
      },
      orderBy: { date: "desc" },
    });
    const rows = [
      ["제목", "장소", "날짜", "상태", "참가자수", "참가자 목록"],
      ...trips.map((t) => [
        t.title,
        t.location ?? "",
        new Date(t.date).toLocaleDateString("ko-KR"),
        t.status === "completed" ? "완료" : t.status === "planned" ? "예정" : "취소",
        t.participants.length,
        t.participants.map((p) => p.member.name).join(", "),
      ]),
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), "낚시일정");
  }

  if (wb.SheetNames.length === 0) {
    return NextResponse.json({ error: "데이터가 없습니다." }, { status: 400 });
  }

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const today = new Date().toISOString().slice(0, 10);
  const filename = `문창호환자들_${type === "all" ? "전체" : type}_${today}.xlsx`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  });
}
