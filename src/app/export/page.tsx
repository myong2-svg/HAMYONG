"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Users, CreditCard, Receipt, Fish } from "lucide-react";

type ExportType = "all" | "members" | "fees" | "expenses" | "trips";

const EXPORT_OPTIONS: { value: ExportType; icon: React.ComponentType<{ className?: string }>; label: string; desc: string; color: string }[] = [
  { value: "all", icon: FileSpreadsheet, label: "전체 데이터", desc: "회원, 회비, 지출, 일정 모두 포함", color: "text-blue-600" },
  { value: "members", icon: Users, label: "회원 명단", desc: "이름, 연락처, 계좌번호 등", color: "text-indigo-600" },
  { value: "fees", icon: CreditCard, label: "회비 내역", desc: "연도/월별 납부 현황", color: "text-green-600" },
  { value: "expenses", icon: Receipt, label: "지출 내역", desc: "항목, 금액, 카테고리별 지출", color: "text-purple-600" },
  { value: "trips", icon: Fish, label: "낚시 일정", desc: "일정, 장소, 참가자 목록", color: "text-teal-600" },
];

export default function ExportPage() {
  const [selected, setSelected] = useState<ExportType>("all");
  const [loading, setLoading] = useState(false);

  const doExport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/export?type=${selected}`);
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "내보내기 실패");
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const nameMatch = cd.match(/filename\*=UTF-8''(.+)/);
      const filename = nameMatch ? decodeURIComponent(nameMatch[1]) : `낚시모임_${selected}_export.xlsx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Excel 내보내기</h1>
        <p className="text-slate-500 text-sm mt-1">회원, 회비, 지출, 낚시 일정 데이터를 Excel 파일로 다운로드</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-semibold text-slate-700 mb-4">내보낼 데이터 선택</h2>
        <div className="space-y-2">
          {EXPORT_OPTIONS.map(({ value, icon: Icon, label, desc, color }) => (
            <label
              key={value}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                selected === value ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="exportType"
                value={value}
                checked={selected === value}
                onChange={() => setSelected(value)}
                className="sr-only"
              />
              <Icon className={`w-5 h-5 shrink-0 ${selected === value ? color : "text-slate-400"}`} />
              <div>
                <div className={`text-sm font-semibold ${selected === value ? "text-slate-800" : "text-slate-700"}`}>
                  {label}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
              </div>
              {selected === value && (
                <div className={`ml-auto w-2 h-2 rounded-full ${color.replace("text-", "bg-")}`} />
              )}
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={doExport}
        disabled={loading}
        className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        <Download className="w-4 h-4" />
        {loading ? "파일 생성 중..." : "Excel 파일 다운로드"}
      </button>

      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 text-xs text-slate-500 space-y-1">
        <p className="font-medium text-slate-600">안내</p>
        <p>• 전체 데이터는 시트별로 분리됩니다 (회원명단, 회비내역, 지출내역, 낚시일정)</p>
        <p>• 한글 파일명 그대로 저장됩니다</p>
        <p>• 날짜는 한국 형식(YYYY. M. D.)으로 표시됩니다</p>
      </div>
    </div>
  );
}
