"use client";

import { useEffect, useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { CheckCircle, XCircle, Plus, ChevronLeft, ChevronRight, Users } from "lucide-react";

interface Fee {
  id: number | null;
  memberId: number;
  amount: number;
  year: number;
  month: number;
  status: string;
  paidAt: string | null;
  note: string | null;
  member: { id: number; name: string };
}

interface Member {
  id: number;
  name: string;
}

export default function FeesPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [fees, setFees] = useState<Fee[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [bulkAmount, setBulkAmount] = useState("30000");
  const [singleForm, setSingleForm] = useState({ memberId: "", amount: "30000", note: "" });

  const load = () => {
    fetch(`/api/fees?year=${year}&month=${month}`).then((r) => r.json()).then(setFees);
  };

  useEffect(() => { load(); }, [year, month]);
  useEffect(() => {
    fetch("/api/members").then((r) => r.json()).then(setMembers);
  }, []);

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  const togglePaid = async (fee: Fee) => {
    if (fee.id === null) {
      // 기록 없음 → 납부완료로 새 레코드 생성
      await fetch("/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: fee.memberId,
          amount: fee.amount,
          year: fee.year,
          month: fee.month,
          status: "paid",
        }),
      });
    } else {
      const newStatus = fee.status === "paid" ? "unpaid" : "paid";
      await fetch(`/api/fees/${fee.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, amount: fee.amount, note: fee.note }),
      });
    }
    load();
  };

  const bulkCreate = async () => {
    await fetch("/api/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bulkCreate: true, year, month, amount: Number(bulkAmount) }),
    });
    setShowForm(false);
    load();
  };

  const addSingle = async () => {
    if (!singleForm.memberId) return;
    await fetch("/api/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: Number(singleForm.memberId),
        amount: Number(singleForm.amount),
        year,
        month,
        note: singleForm.note,
      }),
    });
    setShowForm(false);
    load();
  };

  const paid = fees.filter((f) => f.status === "paid");
  const unpaid = fees.filter((f) => f.status === "unpaid");
  const totalCollected = paid.reduce((s, f) => s + f.amount, 0);
  const totalExpected = fees.reduce((s, f) => s + f.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">회비 관리</h1>
          <p className="text-slate-500 text-sm mt-1">월별 회비 납부 현황</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          회비 등록
        </button>
      </div>

      <div className="flex items-center gap-4">
        <button onClick={prevMonth} className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-lg font-semibold text-slate-700">
          {year}년 {month}월
        </span>
        <button onClick={nextMonth} className="p-2 hover:bg-slate-100 rounded-lg">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-100 rounded-xl p-4">
          <div className="text-xs text-green-600 font-medium mb-1">납부 완료</div>
          <div className="text-xl font-bold text-green-700">{formatCurrency(totalCollected)}</div>
          <div className="text-xs text-green-500 mt-1">{paid.length}명</div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <div className="text-xs text-red-600 font-medium mb-1">미납</div>
          <div className="text-xl font-bold text-red-700">
            {formatCurrency(totalExpected - totalCollected)}
          </div>
          <div className="text-xs text-red-500 mt-1">{unpaid.length}명</div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="text-xs text-blue-600 font-medium mb-1">납부율</div>
          <div className="text-xl font-bold text-blue-700">
            {fees.length > 0 ? Math.round((paid.length / fees.length) * 100) : 0}%
          </div>
          <div className="text-xs text-blue-500 mt-1">{fees.length}명 중 {paid.length}명</div>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="font-semibold text-slate-700">회비 등록</h2>
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <Users className="w-4 h-4" />
              전체 활성 회원 일괄 등록
            </div>
            <div className="flex gap-3 items-end">
              <div>
                <label className="block text-xs text-slate-500 mb-1">회비 금액</label>
                <input
                  type="number"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-36"
                  value={bulkAmount}
                  onChange={(e) => setBulkAmount(e.target.value)}
                />
              </div>
              <button
                onClick={bulkCreate}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                일괄 생성
              </button>
            </div>
          </div>
          <div className="border rounded-lg p-4 space-y-3">
            <div className="text-sm font-medium text-slate-600">개별 추가</div>
            <div className="flex gap-3 flex-wrap items-end">
              <div>
                <label className="block text-xs text-slate-500 mb-1">회원</label>
                <select
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={singleForm.memberId}
                  onChange={(e) => setSingleForm({ ...singleForm, memberId: e.target.value })}
                >
                  <option value="">선택</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">금액</label>
                <input
                  type="number"
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-32"
                  value={singleForm.amount}
                  onChange={(e) => setSingleForm({ ...singleForm, amount: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">메모</label>
                <input
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-40"
                  value={singleForm.note}
                  onChange={(e) => setSingleForm({ ...singleForm, note: e.target.value })}
                  placeholder="선택사항"
                />
              </div>
              <button
                onClick={addSingle}
                className="px-4 py-2 text-sm bg-slate-700 text-white rounded-lg hover:bg-slate-800"
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">회원</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">금액</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">상태</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">납부일</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">메모</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fees.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                  이 달에 등록된 회비가 없습니다.
                </td>
              </tr>
            ) : (
              fees.map((fee) => (
                <tr key={fee.id ?? `virtual-${fee.memberId}`} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs">
                        {fee.member.name[0]}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{fee.member.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-sm font-medium text-slate-700">
                    {formatCurrency(fee.amount)}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      fee.status === "paid"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-600"
                    }`}>
                      {fee.status === "paid" ? "납부완료" : "미납"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-400">
                    {fee.paidAt ? new Date(fee.paidAt).toLocaleDateString("ko-KR") : "-"}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-400">{fee.note ?? "-"}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => togglePaid(fee)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        fee.status === "paid"
                          ? "text-green-500 hover:bg-green-50"
                          : "text-red-400 hover:bg-red-50"
                      }`}
                      title={fee.status === "paid" ? "미납으로 변경" : "납부로 변경"}
                    >
                      {fee.status === "paid" ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <XCircle className="w-5 h-5" />
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
