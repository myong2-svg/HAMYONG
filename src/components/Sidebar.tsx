"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Receipt,
  Fish,
  Calculator,
  FileUp,
  FileDown,
} from "lucide-react";

const navItems = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/members", label: "회원 관리", icon: Users },
  { href: "/fees", label: "회비 관리", icon: Wallet },
  { href: "/expenses", label: "지출 관리", icon: Receipt },
  { href: "/trips", label: "낚시 일정", icon: Fish },
  { href: "/settlements", label: "정산", icon: Calculator },
  { href: "/import", label: "Excel 가져오기", icon: FileUp },
  { href: "/export", label: "Excel 내보내기", icon: FileDown },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-slate-900 text-white flex flex-col shrink-0">
      <div className="p-5 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Fish className="w-6 h-6 text-blue-400" />
          <span className="font-bold text-lg leading-tight">문창호 환자들</span>
        </div>
        <p className="text-slate-400 text-xs mt-1">비용 관리 시스템</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-700 text-xs text-slate-500">
        © 2025 문창호 환자들
      </div>
    </aside>
  );
}
