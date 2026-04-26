"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate, EXPENSE_CATEGORIES, EXPENSE_CATEGORY_COLORS } from "@/lib/utils";
import { Plus, X, Trash2, PenLine } from "lucide-react";

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  date: string;
  description: string | null;
  paidBy: { id: number; name: string } | null;
  trip: { id: number; title: string } | null;
}

interface Member { id: number; name: string }
interface Trip { id: number; title: string }

const emptyForm = {
  title: "",
  amount: "",
  category: "낚시터",
  date: new Date().toISOString().split("T")[0],
  description: "",
  paidById: "",
  tripId: "",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState("");

  const load = () => {
    const q = filterCategory ? `?category=${encodeURIComponent(filterCategory)}` : "";
    fetch(`/api/expenses${q}`).then((r) => r.json()).then(setExpenses);
  };

  useEffect(() => { load(); }, [filterCategory]);
  useEffect(() => {
    fetch("/api/members").then((r) => r.json()).then(setMembers);
    fetch("/api/trips").then((r) => r.json()).then(setTrips);
  }, []);

  const submit = async () => {
    if (!form.title || !form.amount) return;
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/expenses/${editingId}` : "/api/expenses";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setShowForm(false);
    setForm(emptyForm);
    setEditingId(null);
    load();
  };

  const startEdit = (exp: Expense) => {
    setForm({
      title: exp.title,
      amount: String(exp.amount),
      category: exp.category,
      date: exp.date.split("T")[0],
      description: exp.description ?? "",
      paidById: exp.paidBy ? String(exp.paidBy.id) : "",
      tripId: exp.trip ? String(exp.trip.id) : "",
    });
    setEditingId(exp.id);
    setShowForm(true);
  };

  const remove = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    load();
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  const byCategory = EXPENSE_CATEGORIES.map((cat) => ({
    cat,
    total: expenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">지출 관리</h1>
          <p className="text-slate-500 text-sm mt-1">총 {formatCurrency(total)}</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setForm(emptyForm); setEditingId(null); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          지출 추가
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCategory("")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${
            !filterCategory ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          전체 {formatCurrency(total)}
        </button>
        {byCategory.map(({ cat, total: catTotal }) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(filterCategory === cat ? "" : cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-opacity ${
              filterCategory === cat
                ? "bg-slate-800 text-white"
                : `${EXPENSE_CATEGORY_COLORS[cat]} hover:opacity-80`
            }`}
          >
            {cat} {formatCurrency(catTotal)}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700">{editingId ? "지출 수정" : "지출 추가"}</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">항목명 *</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="예: 낚시터 입장료"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">금액 *</label>
              <input
                type="number"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="50000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">카테고리</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">날짜</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">결제자</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.paidById}
                onChange={(e) => setForm({ ...form, paidById: e.target.value })}
              >
                <option value="">선택 안함</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">연결 일정</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.tripId}
                onChange={(e) => setForm({ ...form, tripId: e.target.value })}
              >
                <option value="">없음</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">설명</label>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="추가 설명 (선택사항)"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200">
              취소
            </button>
            <button onClick={submit} className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              {editingId ? "저장" : "추가"}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">항목</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">카테고리</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">금액</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">날짜</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">결제자</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">일정</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {expenses.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                  지출 내역이 없습니다.
                </td>
              </tr>
            ) : (
              expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3">
                    <div className="text-sm font-medium text-slate-700">{exp.title}</div>
                    {exp.description && (
                      <div className="text-xs text-slate-400 mt-0.5">{exp.description}</div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${EXPENSE_CATEGORY_COLORS[exp.category] ?? "bg-gray-100 text-gray-700"}`}>
                      {exp.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm font-semibold text-slate-800">
                    {formatCurrency(exp.amount)}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-500">{formatDate(exp.date)}</td>
                  <td className="px-5 py-3 text-sm text-slate-500">
                    {exp.paidBy?.name ?? "-"}
                  </td>
                  <td className="px-5 py-3 text-sm text-slate-500">
                    {exp.trip?.title ?? "-"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => startEdit(exp)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <PenLine className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => remove(exp.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
