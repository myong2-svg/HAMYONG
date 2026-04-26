import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });
  const setting = await prisma.setting.findUnique({ where: { key } });
  return NextResponse.json({ key, value: setting?.value ?? "0" });
}

export async function PUT(req: NextRequest) {
  const { key, value } = await req.json();
  const setting = await prisma.setting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
  return NextResponse.json(setting);
}
