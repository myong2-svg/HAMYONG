import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "../src/generated/prisma/client";
import path from "path";

const dbPath = path.join(process.cwd(), "dev.db");
const adapter = new PrismaLibSql({ url: `file:${dbPath}` });
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new (PrismaClient as any)({ adapter }) as PrismaClient;

async function main() {
  const members = await Promise.all([
    prisma.member.create({ data: { name: "김낚시", phone: "010-1234-5678", email: "kim@example.com", role: "admin" } }),
    prisma.member.create({ data: { name: "이붕어", phone: "010-2345-6789", email: "lee@example.com" } }),
    prisma.member.create({ data: { name: "박잉어", phone: "010-3456-7890" } }),
    prisma.member.create({ data: { name: "최민물", phone: "010-4567-8901", email: "choi@example.com" } }),
    prisma.member.create({ data: { name: "정바다", phone: "010-5678-9012" } }),
  ]);

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  await Promise.all(
    members.map((m, i) =>
      prisma.fee.create({
        data: {
          memberId: m.id,
          amount: 30000,
          year,
          month,
          status: i < 3 ? "paid" : "unpaid",
          paidAt: i < 3 ? new Date() : null,
        },
      })
    )
  );

  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  await Promise.all(
    members.map((m) =>
      prisma.fee.create({
        data: { memberId: m.id, amount: 30000, year: prevYear, month: prevMonth, status: "paid", paidAt: new Date() },
      })
    )
  );

  const trip1 = await prisma.trip.create({
    data: {
      title: "4월 정기 낚시",
      location: "충주호 낚시터",
      date: new Date(year, month - 2, 15),
      description: "봄 시즌 첫 정기 낚시",
      status: "completed",
    },
  });

  await prisma.trip.create({
    data: {
      title: "5월 정기 낚시",
      location: "소양강 낚시터",
      date: new Date(year, month - 1, 20),
      description: "연휴 낚시 여행",
      status: "planned",
    },
  });

  await Promise.all(
    members.slice(0, 4).map((m) =>
      prisma.tripParticipant.create({
        data: { tripId: trip1.id, memberId: m.id, paid: true, amount: 0 },
      })
    )
  );

  await prisma.expense.createMany({
    data: [
      { title: "충주호 입장료", amount: 80000, category: "낚시터", date: new Date(year, month - 2, 15), paidById: members[0].id, tripId: trip1.id },
      { title: "점심 식사", amount: 60000, category: "식비", date: new Date(year, month - 2, 15), paidById: members[1].id, tripId: trip1.id },
      { title: "낚시 미끼", amount: 30000, category: "장비", date: new Date(year, month - 2, 15), paidById: members[0].id, tripId: trip1.id },
      { title: "유류비", amount: 50000, category: "교통", date: new Date(year, month - 2, 15), paidById: members[2].id, tripId: trip1.id },
      { title: "낚싯대 구매", amount: 150000, category: "장비", date: new Date(year, month - 1, 5), paidById: members[0].id },
    ],
  });

  console.log("샘플 데이터 생성 완료!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
