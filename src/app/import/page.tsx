"use client";

import { useRef, useState } from "react";
import {
  Upload, FileSpreadsheet, CheckCircle, AlertCircle, Eye, X,
  ChevronDown, Download, Lock, Fish, Banknote, Table2,
} from "lucide-react";

type ImportMode = "general" | "club" | "kakaobank";
type GeneralType = "auto" | "members" | "fees" | "expenses";
type KakaobankMode = "auto" | "fee" | "expense";

interface SheetPreview {
  sheet: string;
  totalRows: number;
  headers: string[];
  sample: Record<string, unknown>[];
  type?: string;
  members?: number;
  feeRecords?: number;
  memberList?: string[];
  title?: string;
  date?: string;
  participants?: string[];
  skip?: boolean;
}

interface ImportResult {
  members?: number;
  fees?: number;
  expenses?: number;
  trips?: number;
  skipped?: number;
  errors: string[];
}

const GENERAL_TYPE_OPTIONS: { value: GeneralType; label: string; desc: string }[] = [
  { value: "auto", label: "자동 감지", desc: "시트 이름과 열 이름으로 자동 판단" },
  { value: "members", label: "회원 명단", desc: "이름, 연락처, 주소 등 회원 정보" },
  { value: "fees", label: "회비 내역", desc: "회원별 납부 현황" },
  { value: "expenses", label: "지출 내역", desc: "항목, 금액, 날짜 등" },
];

const KAKAOBANK_MODE_OPTIONS: { value: KakaobankMode; label: string; desc: string }[] = [
  { value: "auto", label: "자동", desc: "입금→회비, 출금→지출 자동 분류" },
  { value: "fee", label: "회비만", desc: "입금 내역만 회비로 처리" },
  { value: "expense", label: "지출만", desc: "출금 내역만 지출로 처리" },
];

const COLUMN_GUIDE: Record<GeneralType, { field: string; aliases: string; required: boolean }[]> = {
  auto: [],
  members: [
    { field: "이름", aliases: "이름, name, 성명", required: true },
    { field: "연락처", aliases: "연락처, phone, 휴대폰, 전화번호", required: false },
    { field: "이메일", aliases: "이메일, email", required: false },
    { field: "주소", aliases: "주소, address, 거주지", required: false },
    { field: "생년월일", aliases: "생년월일, birth, 생일", required: false },
    { field: "계좌번호", aliases: "계좌번호, 계좌, bank", required: false },
    { field: "가입일", aliases: "가입일, joindate, 입회일", required: false },
    { field: "역할", aliases: "역할, role, 직책 (관리자 입력 시 관리자로 설정)", required: false },
    { field: "비고", aliases: "비고, 메모, note", required: false },
  ],
  fees: [
    { field: "이름", aliases: "이름, name, 회원, 회원명", required: true },
    { field: "년도", aliases: "년도, year, 연도", required: true },
    { field: "월", aliases: "월, month", required: true },
    { field: "금액", aliases: "금액, amount, 회비, 납부금액", required: false },
    { field: "납부여부", aliases: "납부여부, status, 납부 (납부/완료/Y → 납부완료)", required: false },
    { field: "납부일", aliases: "납부일, paidat, 납부날짜", required: false },
    { field: "비고", aliases: "비고, 메모, note", required: false },
  ],
  expenses: [
    { field: "항목", aliases: "항목, title, 내용, 지출항목, 내역", required: true },
    { field: "금액", aliases: "금액, amount, 지출금액, 비용", required: true },
    { field: "카테고리", aliases: "카테고리, category, 분류 (낚시터/식비/장비/교통/기타)", required: false },
    { field: "날짜", aliases: "날짜, date, 지출일, 일자", required: false },
    { field: "결제자", aliases: "결제자, paidby (회원 이름과 일치해야 함)", required: false },
    { field: "설명", aliases: "설명, description, 비고, 메모", required: false },
  ],
};

export default function ImportPage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMode, setImportMode] = useState<ImportMode>("club");
  const [generalType, setGeneralType] = useState<GeneralType>("auto");
  const [kakaobankMode, setKakaobankMode] = useState<KakaobankMode>("auto");
  const [password, setPassword] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SheetPreview[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const resetState = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
  };

  const getPreviewEndpoint = () => {
    if (importMode === "club") return "/api/import/club";
    if (importMode === "kakaobank") return "/api/import/kakaobank";
    return "/api/import";
  };

  const getImportEndpoint = () => getPreviewEndpoint();

  const handleFile = async (f: File) => {
    setFile(f);
    setPreview(null);
    setResult(null);
    setError(null);

    setPreviewLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", f);
      if (importMode === "kakaobank" && password) fd.append("password", password);
      const res = await fetch(getPreviewEndpoint(), { method: "PUT", body: fd });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setPreview(data.sheets ?? data.preview);
      }
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const doImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    if (importMode === "general") fd.append("type", generalType);
    if (importMode === "kakaobank") {
      if (password) fd.append("password", password);
      fd.append("mode", kakaobankMode);
    }
    const res = await fetch(getImportEndpoint(), { method: "POST", body: fd });
    const data = await res.json();
    if (data.error) setError(data.error);
    else setResult(data);
    setLoading(false);
  };

  const handlePasswordPreview = async () => {
    if (!file) return;
    await handleFile(file);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Excel 가져오기</h1>
          <p className="text-slate-500 text-sm mt-1">회원, 회비, 지출 내역을 Excel 파일로 한 번에 등록</p>
        </div>
        <a
          href="/sample-import.xlsx"
          download
          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg px-3 py-2 hover:bg-blue-50"
        >
          <Download className="w-4 h-4" />
          샘플 파일
        </a>
      </div>

      {/* 가져오기 방식 탭 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-semibold text-slate-700 mb-3">파일 종류 선택</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "club" as ImportMode, icon: Fish, label: "낚시모임 회계장부", desc: "낚시모임회계(문창호환자들).xlsx 형식", color: "text-teal-600", bg: "border-teal-500 bg-teal-50" },
            { value: "kakaobank" as ImportMode, icon: Banknote, label: "카카오뱅크 거래내역", desc: "카카오뱅크 엑셀 내보내기 파일", color: "text-yellow-600", bg: "border-yellow-500 bg-yellow-50" },
            { value: "general" as ImportMode, icon: Table2, label: "일반 Excel", desc: "직접 작성한 회원/회비/지출 파일", color: "text-blue-600", bg: "border-blue-500 bg-blue-50" },
          ].map(({ value, icon: Icon, label, desc, color, bg }) => (
            <button
              key={value}
              onClick={() => { setImportMode(value); resetState(); }}
              className={`p-4 rounded-lg border-2 text-left transition-colors ${
                importMode === value ? bg : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <Icon className={`w-5 h-5 mb-2 ${importMode === value ? color : "text-slate-400"}`} />
              <div className={`text-sm font-semibold ${importMode === value ? color : "text-slate-700"}`}>{label}</div>
              <div className="text-xs text-slate-400 mt-0.5 leading-tight">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* 카카오뱅크 옵션 */}
      {importMode === "kakaobank" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-yellow-800">카카오뱅크 설정</h2>
          <div>
            <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5 mb-1.5">
              <Lock className="w-3.5 h-3.5" /> 파일 비밀번호
            </label>
            <div className="flex gap-2">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="카카오뱅크 파일 비밀번호"
                className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              {file && (
                <button
                  onClick={handlePasswordPreview}
                  className="px-3 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                >
                  재시도
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">처리 방식</label>
            <div className="grid grid-cols-3 gap-2">
              {KAKAOBANK_MODE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setKakaobankMode(opt.value)}
                  className={`p-2.5 rounded-lg border-2 text-left transition-colors ${
                    kakaobankMode === opt.value
                      ? "border-yellow-500 bg-yellow-100"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className={`text-xs font-semibold ${kakaobankMode === opt.value ? "text-yellow-700" : "text-slate-700"}`}>
                    {opt.label}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 일반 Excel 옵션 */}
      {importMode === "general" && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-slate-700">데이터 종류</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {GENERAL_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setGeneralType(opt.value)}
                className={`p-3 rounded-lg border-2 text-left transition-colors ${
                  generalType === opt.value ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className={`text-sm font-semibold ${generalType === opt.value ? "text-blue-700" : "text-slate-700"}`}>
                  {opt.label}
                </div>
                <div className="text-xs text-slate-400 mt-0.5 leading-tight">{opt.desc}</div>
              </button>
            ))}
          </div>

          {generalType !== "auto" && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-slate-600 hover:bg-slate-100"
                onClick={() => setShowGuide(!showGuide)}
              >
                <span>Excel 열 이름 가이드</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${showGuide ? "rotate-180" : ""}`} />
              </button>
              {showGuide && (
                <div className="px-5 pb-4">
                  <p className="text-xs text-slate-500 mb-3">아래 열 이름 중 하나를 Excel 헤더로 사용하면 자동으로 인식합니다.</p>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-white">
                        <th className="text-left py-1.5 px-2 text-slate-500 font-medium">필드</th>
                        <th className="text-left py-1.5 px-2 text-slate-500 font-medium">인식되는 열 이름</th>
                        <th className="text-left py-1.5 px-2 text-slate-500 font-medium">필수</th>
                      </tr>
                    </thead>
                    <tbody>
                      {COLUMN_GUIDE[generalType].map((g) => (
                        <tr key={g.field} className="border-t border-slate-100">
                          <td className="py-1.5 px-2 font-medium text-slate-700">{g.field}</td>
                          <td className="py-1.5 px-2 text-slate-500">{g.aliases}</td>
                          <td className="py-1.5 px-2">
                            {g.required ? <span className="text-red-500 font-bold">필수</span> : <span className="text-slate-300">선택</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 파일 업로드 */}
      <div
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
          file ? "border-blue-300 bg-blue-50" : "border-slate-300 hover:border-blue-300 hover:bg-blue-50"
        }`}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
      >
        {file ? (
          <div className="space-y-2">
            <FileSpreadsheet className="w-10 h-10 text-blue-500 mx-auto" />
            <div className="text-sm font-medium text-blue-700">{file.name}</div>
            <div className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</div>
            <button
              onClick={() => { setFile(null); setPreview(null); setResult(null); }}
              className="text-xs text-red-400 hover:text-red-600 flex items-center gap-1 mx-auto"
            >
              <X className="w-3 h-3" /> 파일 제거
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-slate-500">
              <span className="font-medium">파일을 드래그하거나</span>
              <button
                onClick={() => fileRef.current?.click()}
                className="text-blue-500 hover:underline ml-1"
              >
                클릭해서 선택
              </button>
            </div>
            <p className="text-xs text-slate-400">.xlsx, .xls, .csv 지원</p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
      </div>

      {/* 미리보기 */}
      {previewLoading && <div className="text-center text-slate-400 py-4 text-sm">파일 분석 중...</div>}

      {preview && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-slate-700 text-sm">미리보기</h2>
          </div>
          {preview.map((sheet, i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-slate-700">시트: {sheet.sheet}</span>
                  {sheet.type && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      sheet.type === "회비" ? "bg-green-100 text-green-700" :
                      sheet.type === "낚시일정" ? "bg-blue-100 text-blue-700" :
                      sheet.skip ? "bg-slate-100 text-slate-400" : "bg-slate-100 text-slate-600"
                    }`}>
                      {sheet.type}
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 flex gap-3">
                  {sheet.totalRows != null && <span>총 {sheet.totalRows}행</span>}
                  {sheet.members != null && <span>회원 {sheet.members}명</span>}
                  {sheet.feeRecords != null && <span>회비 {sheet.feeRecords}건</span>}
                  {sheet.participants != null && <span>참가자 {sheet.participants.length}명</span>}
                </div>
              </div>

              {/* 회비 시트: 회원 목록 */}
              {sheet.memberList && sheet.memberList.length > 0 && (
                <div className="px-4 py-3 text-xs text-slate-600 border-b border-slate-100">
                  <span className="font-medium">회원: </span>
                  {sheet.memberList.slice(0, 15).join(", ")}
                  {sheet.memberList.length > 15 && ` 외 ${sheet.memberList.length - 15}명`}
                </div>
              )}

              {/* 낚시일정: 참가자 */}
              {sheet.participants && sheet.participants.length > 0 && (
                <div className="px-4 py-3 text-xs text-slate-600 border-b border-slate-100">
                  <span className="font-medium">참가자: </span>
                  {sheet.participants.join(", ")}
                </div>
              )}

              {/* 일반 Excel: 샘플 테이블 */}
              {sheet.headers && sheet.headers.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-slate-50">
                        {sheet.headers.map((h) => (
                          <th key={h} className="text-left px-3 py-2 text-slate-500 font-medium whitespace-nowrap border-b border-slate-100">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {(sheet.sample ?? []).map((row, ri) => (
                        <tr key={ri} className="hover:bg-slate-50">
                          {sheet.headers.map((h) => (
                            <td key={h} className="px-3 py-2 text-slate-600 whitespace-nowrap max-w-32 truncate">
                              {String(row[h] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {sheet.skip && (
                <div className="px-4 py-3 text-xs text-slate-400">이 시트는 가져오기에서 제외됩니다.</div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 가져오기 버튼 */}
      {file && preview && !error && (
        <button
          onClick={doImport}
          disabled={loading}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "가져오는 중..." : "데이터 가져오기"}
        </button>
      )}

      {/* 결과 */}
      {result && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h2 className="font-semibold text-slate-700">가져오기 완료</h2>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {[
              { label: "회원", count: result.members ?? 0, color: "bg-blue-50 text-blue-700" },
              { label: "회비", count: result.fees ?? 0, color: "bg-green-50 text-green-700" },
              { label: "지출", count: result.expenses ?? 0, color: "bg-purple-50 text-purple-700" },
              { label: "일정", count: result.trips ?? 0, color: "bg-teal-50 text-teal-700" },
              { label: "건너뜀", count: result.skipped ?? 0, color: "bg-slate-50 text-slate-500" },
            ].map(({ label, count, color }) => (
              <div key={label} className={`${color} rounded-lg p-3 text-center`}>
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>
          {result.errors.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-sm font-medium text-red-700">오류 {result.errors.length}건</span>
              </div>
              <ul className="space-y-1">
                {result.errors.map((e, i) => (
                  <li key={i} className="text-xs text-red-600">• {e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span className="text-sm text-red-700">{error}</span>
        </div>
      )}
    </div>
  );
}
