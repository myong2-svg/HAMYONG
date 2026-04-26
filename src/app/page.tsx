"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate, EXPENSE_CATEGORY_COLORS } from "@/lib/utils";
import {
  Users, Wallet, Receipt, Fish, AlertCircle, PenLine, Check, Vault, Lock, Unlock, X,
} from "lucide-react";

interface DashboardData {
  totalMembers: number;
  activeMembers: number;
  totalFeeCollected: number;
  totalExpenses: number;
  balance: number;
  safebox: number;
  accountBalance: number;
  accountBalanceIsManual: boolean;
  unpaidCount: number;
  unpaidMembers: { memberId: number; name: string; amount: number; months: number; isManual: boolean; carryover: number }[];
  totalUnpaidAmount: number;
  memberNames: string[];
  feeByYear: { year: number; amount: number }[];
  recentExpenses: Array<{
    id: number;
    title: string;
    amount: number;
    category: string;
    date: string;
    paidBy?: { name: string };
    trip?: { title: string };
  }>;
  upcomingTrips: Array<{
    id: number;
    title: string;
    location: string;
    date: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [editingSafebox, setEditingSafebox] = useState(false);
  const [safeboxInput, setSafeboxInput] = useState("");
  const [editingUnpaid, setEditingUnpaid] = useState(false);
  const [unpaidInput, setUnpaidInput] = useState("");
  const [editingAccountBalance, setEditingAccountBalance] = useState(false);
  const [accountBalanceInput, setAccountBalanceInput] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<number | null>(null);
  const [memberAmountInput, setMemberAmountInput] = useState("");
  const [editingCarryoverId, setEditingCarryoverId] = useState<number | null>(null);
  const [carryoverInput, setCarryoverInput] = useState("");

  // 관리자 인증
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [adminError, setAdminError] = useState("");
  const [storedAdminPass, setStoredAdminPass] = useState<string | null>(null);
  const [adminSetupInput, setAdminSetupInput] = useState("");
  const [adminSetupConfirm, setAdminSetupConfirm] = useState("");
  const [adminSetupError, setAdminSetupError] = useState("");

  const load = () =>
    fetch("/api/dashboard").then((r) => r.json()).then(setData);

  useEffect(() => {
    load();
    if (sessionStorage.getItem("isAdmin") === "true") setIsAdmin(true);
    fetch("/api/settings?key=admin_password")
      .then(r => r.json())
      .then(d => setStoredAdminPass(d.value && d.value !== "0" ? d.value : ""));
  }, []);

  const saveSafebox = async () => {
    const value = parseInt(safeboxInput.replace(/[^0-9]/g, "")) || 0;
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "safebox", value }),
    });
    setEditingSafebox(false);
    load();
  };

  const saveUnpaid = async () => {
    const value = parseInt(unpaidInput.replace(/[^0-9]/g, "")) || 0;
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "unpaid_amount", value }),
    });
    setEditingUnpaid(false);
    load();
  };

  const saveAccountBalance = async () => {
    const value = parseInt(accountBalanceInput.replace(/[^0-9]/g, "")) || 0;
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "account_balance", value }),
    });
    setEditingAccountBalance(false);
    load();
  };

  const saveMemberAmount = async (memberId: number) => {
    const value = parseInt(memberAmountInput.replace(/[^0-9]/g, "")) || 0;
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: `unpaid_mid_${memberId}`, value }),
    });
    setEditingMemberId(null);
    load();
  };

  const resetMemberAmount = async (memberId: number) => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: `unpaid_mid_${memberId}`, value: 0 }),
    });
    load();
  };

  const saveCarryover = async (memberId: number) => {
    const value = parseInt(carryoverInput.replace(/[^0-9]/g, "")) || 0;
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: `carryover_mid_${memberId}`, value }),
    });
    setEditingCarryoverId(null);
    load();
  };

  const resetAccountBalance = async () => {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "account_balance", value: 0 }),
    });
    setEditingAccountBalance(false);
    load();
  };

  const verifyAdmin = () => {
    if (adminPasswordInput === storedAdminPass) {
      setIsAdmin(true);
      sessionStorage.setItem("isAdmin", "true");
      setShowAdminModal(false);
      setAdminPasswordInput("");
      setAdminError("");
    } else {
      setAdminError("비밀번호가 틀렸습니다.");
    }
  };

  const logoutAdmin = () => {
    setIsAdmin(false);
    sessionStorage.removeItem("isAdmin");
    setEditingSafebox(false);
    setEditingUnpaid(false);
    setEditingAccountBalance(false);
  };

  const setupAdmin = async () => {
    if (!adminSetupInput) { setAdminSetupError("비밀번호를 입력해주세요."); return; }
    if (adminSetupInput !== adminSetupConfirm) { setAdminSetupError("비밀번호가 일치하지 않습니다."); return; }
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "admin_password", value: adminSetupInput }),
    });
    setStoredAdminPass(adminSetupInput);
    setIsAdmin(true);
    sessionStorage.setItem("isAdmin", "true");
    setShowAdminModal(false);
    setAdminSetupInput("");
    setAdminSetupConfirm("");
    setAdminSetupError("");
  };

  const closeAdminModal = () => {
    setShowAdminModal(false);
    setAdminPasswordInput("");
    setAdminError("");
    setAdminSetupInput("");
    setAdminSetupConfirm("");
    setAdminSetupError("");
  };

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 관리자 인증 모달 */}
      {showAdminModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          onClick={closeAdminModal}
        >
          <div
            className="bg-white rounded-xl p-6 w-80 shadow-xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-800">관리자 인증</h3>
              <button onClick={closeAdminModal} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            {storedAdminPass === "" ? (
              <div className="space-y-3">
                <p className="text-xs text-slate-500">비밀번호가 설정되지 않았습니다. 새 비밀번호를 만들어주세요.</p>
                <input
                  type="password"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="새 비밀번호"
                  value={adminSetupInput}
                  onChange={e => setAdminSetupInput(e.target.value)}
                  autoFocus
                />
                <input
                  type="password"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="비밀번호 확인"
                  value={adminSetupConfirm}
                  onChange={e => setAdminSetupConfirm(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") setupAdmin(); }}
                />
                {adminSetupError && <p className="text-xs text-red-500">{adminSetupError}</p>}
                <button
                  onClick={setupAdmin}
                  className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700"
                >
                  비밀번호 설정
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="password"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  placeholder="비밀번호"
                  value={adminPasswordInput}
                  onChange={e => setAdminPasswordInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") verifyAdmin(); }}
                  autoFocus
                />
                {adminError && <p className="text-xs text-red-500">{adminError}</p>}
                <button
                  onClick={verifyAdmin}
                  className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700"
                >
                  확인
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">대시보드</h1>
          <p className="text-slate-500 text-sm mt-1">문창호 환자들 재정 현황</p>
        </div>
        <button
          onClick={() => isAdmin ? logoutAdmin() : setShowAdminModal(true)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
            isAdmin
              ? "bg-green-100 text-green-700 hover:bg-green-200"
              : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`}
        >
          {isAdmin ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
          {isAdmin ? "관리자" : "잠금"}
        </button>
      </div>

      {/* 1행: 회원 / 총 지출 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* 전체 회원 카드 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500 font-medium">전체 회원</span>
            <div className="bg-blue-500 p-2 rounded-lg">
              <Users className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-800">{data.totalMembers}명</div>
          <div className="text-xs text-slate-400 mt-1 mb-3">활성 {data.activeMembers}명</div>
          <div className="flex flex-wrap gap-1">
            {data.memberNames.map((name) => (
              <span
                key={name}
                className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* 총 지출 카드 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500 font-medium">총 지출</span>
            <div className="bg-red-500 p-2 rounded-lg">
              <Receipt className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-800">{formatCurrency(data.totalExpenses)}</div>
          <div className="text-xs text-slate-400 mt-1">누적 지출</div>
        </div>
      </div>

      {/* 2행: 세이프박스 / 통장잔액 / 총액 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* 세이프박스 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500 font-medium">세이프박스</span>
            <div className="flex items-center gap-1">
              {isAdmin && (
                <button
                  onClick={() => { setSafeboxInput(String(data.safebox)); setEditingSafebox(true); }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                  <PenLine className="w-3.5 h-3.5" />
                </button>
              )}
              <div className="bg-violet-500 p-2 rounded-lg">
                <Vault className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
          {editingSafebox ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                className="border border-slate-300 rounded-lg px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-violet-400"
                value={safeboxInput}
                onChange={(e) => setSafeboxInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveSafebox(); if (e.key === "Escape") setEditingSafebox(false); }}
                autoFocus
              />
              <button onClick={saveSafebox} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-xl font-bold text-slate-800">{formatCurrency(data.safebox)}</div>
          )}
          <div className="text-xs text-slate-400 mt-1">카카오뱅크 세이프박스</div>
        </div>

        {/* 통장잔액 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500 font-medium">통장잔액</span>
            <div className="flex items-center gap-1">
              {isAdmin && (
                <button
                  onClick={() => { setAccountBalanceInput(String(data.accountBalance)); setEditingAccountBalance(true); }}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                >
                  <PenLine className="w-3.5 h-3.5" />
                </button>
              )}
              <div className={`p-2 rounded-lg ${data.accountBalance >= 0 ? "bg-emerald-500" : "bg-orange-500"}`}>
                <Wallet className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
          {editingAccountBalance ? (
            <div className="flex items-center gap-2 mt-1">
              <input
                type="number"
                className="border border-slate-300 rounded-lg px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-emerald-400"
                value={accountBalanceInput}
                onChange={(e) => setAccountBalanceInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") saveAccountBalance(); if (e.key === "Escape") setEditingAccountBalance(false); }}
                autoFocus
              />
              <button onClick={saveAccountBalance} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="text-xl font-bold text-slate-800">{formatCurrency(data.accountBalance)}</div>
          )}
          <div className="flex items-center justify-between mt-1">
            <div className="text-xs text-slate-400">
              {data.accountBalanceIsManual ? "수동 입력값" : "회비수입 - 통장출금 - 세이프박스"}
            </div>
            {isAdmin && data.accountBalanceIsManual && !editingAccountBalance && (
              <button
                onClick={resetAccountBalance}
                className="text-xs text-slate-400 hover:text-red-500"
                title="자동 계산으로 초기화"
              >
                초기화
              </button>
            )}
          </div>
        </div>

        {/* 총액 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-500 font-medium">총액</span>
            <div className={`p-2 rounded-lg ${data.balance >= 0 ? "bg-teal-500" : "bg-orange-500"}`}>
              <Wallet className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-xl font-bold text-slate-800">{formatCurrency(data.balance)}</div>
          <div className="text-xs text-slate-400 mt-1">세이프박스 + 통장잔액</div>
        </div>
      </div>

      {/* 미납자 + 최근 지출 + 낚시 일정 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 미납자 */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h2 className="font-semibold text-amber-800">미납자</h2>
            <span className="ml-auto bg-amber-200 text-amber-800 text-xs font-bold px-2 py-0.5 rounded-full">
              {data.unpaidCount}명
            </span>
          </div>
          {data.unpaidCount > 0 ? (
            <div className="space-y-1.5">
              {data.unpaidMembers.map(({ memberId, name, amount, months, isManual, carryover }) => (
                <div key={memberId} className="text-sm text-amber-700">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full shrink-0" />
                      <span>{name}</span>
                      {months > 0 && <span className="text-xs text-amber-400">{months}개월</span>}
                      {carryover > 0 && <span className="text-xs text-orange-500">+이월{formatCurrency(carryover)}</span>}
                      {isManual && <span className="text-xs text-amber-400">(수동)</span>}
                    </div>
                    <div className="flex items-center gap-1">
                      {isAdmin && editingMemberId !== memberId && (
                        <button
                          onClick={() => { setMemberAmountInput(String(amount - carryover)); setEditingMemberId(memberId); }}
                          className="p-0.5 text-amber-400 hover:text-amber-700 hover:bg-amber-100 rounded"
                          title="'26년 미납금 수동 수정"
                        >
                          <PenLine className="w-3 h-3" />
                        </button>
                      )}
                      {isAdmin && editingCarryoverId !== memberId && (
                        <button
                          onClick={() => { setCarryoverInput(String(carryover)); setEditingCarryoverId(memberId); setEditingMemberId(null); }}
                          className="p-0.5 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                          title="이전연도 이월미납금 수정"
                        >
                          <PenLine className="w-3 h-3" />
                        </button>
                      )}
                      {isAdmin && isManual && editingMemberId !== memberId && (
                        <button
                          onClick={() => resetMemberAmount(memberId)}
                          className="text-xs text-amber-300 hover:text-red-500"
                          title="자동 계산으로 초기화"
                        >
                          초기화
                        </button>
                      )}
                      {editingMemberId !== memberId && editingCarryoverId !== memberId && (
                        <span className="text-xs font-semibold text-amber-700">{formatCurrency(amount)}</span>
                      )}
                    </div>
                  </div>
                  {editingMemberId === memberId && (
                    <div className="flex items-center gap-2 mt-1 ml-3">
                      <span className="text-xs text-amber-500 shrink-0">'26년</span>
                      <input
                        type="number"
                        className="border border-amber-300 rounded-lg px-2 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                        value={memberAmountInput}
                        onChange={(e) => setMemberAmountInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveMemberAmount(memberId); if (e.key === "Escape") setEditingMemberId(null); }}
                        autoFocus
                      />
                      <button onClick={() => saveMemberAmount(memberId)} className="p-1 text-green-600 hover:bg-green-50 rounded shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingMemberId(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {editingCarryoverId === memberId && (
                    <div className="flex items-center gap-2 mt-1 ml-3">
                      <span className="text-xs text-orange-500 shrink-0">이월</span>
                      <input
                        type="number"
                        className="border border-orange-300 rounded-lg px-2 py-1 text-xs w-full focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                        value={carryoverInput}
                        onChange={(e) => setCarryoverInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveCarryover(memberId); if (e.key === "Escape") setEditingCarryoverId(null); }}
                        autoFocus
                      />
                      <button onClick={() => saveCarryover(memberId)} className="p-1 text-green-600 hover:bg-green-50 rounded shrink-0">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingCarryoverId(null)} className="p-1 text-slate-400 hover:bg-slate-50 rounded shrink-0">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-amber-600">전원 납부 완료</p>
          )}
          <div className="mt-3 pt-3 border-t border-amber-200">
            <div className="flex items-center justify-between">
              <span className="text-xs text-amber-700">총 미납금액</span>
              {isAdmin && (
                <button
                  onClick={() => { setUnpaidInput(String(data.totalUnpaidAmount)); setEditingUnpaid(true); }}
                  className="p-1 text-amber-500 hover:text-amber-700 hover:bg-amber-100 rounded"
                >
                  <PenLine className="w-3 h-3" />
                </button>
              )}
            </div>
            {editingUnpaid ? (
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  className="border border-amber-300 rounded-lg px-2 py-1 text-sm w-full focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
                  value={unpaidInput}
                  onChange={(e) => setUnpaidInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveUnpaid(); if (e.key === "Escape") setEditingUnpaid(false); }}
                  autoFocus
                />
                <button onClick={saveUnpaid} className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="text-sm font-bold text-amber-800 mt-0.5">{formatCurrency(data.totalUnpaidAmount)}</div>
            )}
          </div>
        </div>

        {/* 최근 지출 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100 lg:col-span-2">
          <h2 className="font-semibold text-slate-700 mb-4">최근 지출</h2>
          {data.recentExpenses.length === 0 ? (
            <p className="text-slate-400 text-sm">지출 내역이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {data.recentExpenses.map((exp) => (
                <div key={exp.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        EXPENSE_CATEGORY_COLORS[exp.category] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {exp.category}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-slate-700">{exp.title}</div>
                      <div className="text-xs text-slate-400">{formatDate(exp.date)}</div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-800">
                    {formatCurrency(exp.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 예정된 낚시 일정 */}
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <Fish className="w-4 h-4 text-blue-500" />
            <h2 className="font-semibold text-slate-700">예정된 낚시 일정</h2>
          </div>
          {data.upcomingTrips.length === 0 ? (
            <p className="text-slate-400 text-sm">예정된 일정이 없습니다.</p>
          ) : (
            <div className="space-y-3">
              {data.upcomingTrips.map((trip) => (
                <div key={trip.id} className="border-l-2 border-blue-400 pl-3">
                  <div className="text-sm font-medium text-slate-700">{trip.title}</div>
                  <div className="text-xs text-slate-400">{trip.location}</div>
                  <div className="text-xs text-blue-500 mt-0.5">{formatDate(trip.date)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
