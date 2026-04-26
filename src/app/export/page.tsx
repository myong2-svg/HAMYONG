"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import { Download, FileSpreadsheet, Users, CreditCard, Receipt, Fish, Lock, Unlock } from "lucide-react";
import { useAdminAuth } from "@/lib/useAdminAuth";

type ExportType = "all" | "members" | "fees" | "expenses" | "trips";

const EXPORT_OPTIONS: { value: ExportType; icon: ComponentType<{ className?: string }>; label: string; desc: string; color: string }[] = [
  { value: "all", icon: FileSpreadsheet, label: "전체 데이터", desc: "회원, 회비, 지출, 일정 모두 포함", color: "text-blue-600" },
  { value: "members", icon: Users, label: "회원 명단", desc: "이름, 연락처, 계좌번호 등", color: "text-indigo-600" },
  { value: "fees", icon: CreditCard, label: "회비 내역", desc: "연도/월별 납부 현황", color: "text-green-600" },
  { value: "expenses", icon: Receipt, label: "지출 내역", desc: "항목, 금액, 카테고리별 지출", color: "text-purple-600" },
  { value: "trips", icon: Fish, label: "낚시 일정", desc: "일정, 장소, 참가자 목록", color: "text-teal-600" },
];

export default function ExportPage() {
  const [selected, setSelected] = useState<ExportType>("all");
  const [loading, setLoading] = useState(false);

  const {
    isAdmin, showModal, passwordInput, setPasswordInput,
    error, storedPass, setupInput, setSetupInput,
    setupConfirm, setSetupConfirm, setupError,
    openModal, closeModal, verify, setup, logout,
  } = useAdminAuth();

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
      {/* 관리자 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-80">
            {storedPass === "" ? (
              <>
                <h2 className="font-bold text-slate-800 mb-1">관리자 비밀번호 설정</h2>
                <p className="text-xs text-slate-500 mb-4">처음 사용 시 비밀번호를 설정합니다.</p>
                <input
                  type="password"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="새 비밀번호"
                  value={setupInput}
                  onChange={(e) => setSetupInput(e.target.value)}
                />
                <input
                  type="password"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="비밀번호 확인"
                  value={setupConfirm}
                  onChange={(e) => setSetupConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && setup()}
                />
                {setupError && <p className="text-xs text-red-500 mb-2">{setupError}</p>}
                <div className="flex gap-2">
                  <button onClick={closeModal} className="flex-1 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">취소</button>
                  <button onClick={setup} className="flex-1 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">설정</button>
                </div>
              </>
            ) : (
              <>
                <h2 className="font-bold text-slate-800 mb-4">관리자 인증</h2>
                <input
                  type="password"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="비밀번호 입력"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && verify()}
                  autoFocus
                />
                {error && <p className="text-xs text-red-500 mb-2">{error}</p>}
                <div className="flex gap-2">
                  <button onClick={closeModal} className="flex-1 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">취소</button>
                  <button onClick={verify} className="flex-1 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">확인</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Excel 내보내기</h1>
          <p className="text-slate-500 text-sm mt-1">회원, 회비, 지출, 낚시 일정 데이터를 Excel 파일로 다운로드</p>
        </div>
        <button
          onClick={isAdmin ? logout : openModal}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isAdmin
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {isAdmin ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
          {isAdmin ? "관리자" : "잠김"}
        </button>
      </div>

      {!isAdmin ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 flex flex-col items-center gap-4 text-center">
          <Lock className="w-10 h-10 text-slate-300" />
          <div>
            <p className="font-semibold text-slate-600">관리자 인증이 필요합니다</p>
            <p className="text-sm text-slate-400 mt-1">Excel 내보내기는 관리자만 사용할 수 있습니다.</p>
          </div>
          <button
            onClick={openModal}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            인증하기
          </button>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
