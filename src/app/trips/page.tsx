"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Plus, X, Fish, MapPin, Calendar, Users, Receipt, PenLine, Trash2 } from "lucide-react";

interface Trip {
  id: number;
  title: string;
  location: string;
  date: string;
  description: string | null;
  status: string;
  _count: { participants: number; expenses: number };
  expenses: Array<{ amount: number }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  planned: { label: "예정", color: "bg-blue-100 text-blue-700" },
  completed: { label: "완료", color: "bg-green-100 text-green-700" },
  cancelled: { label: "취소", color: "bg-red-100 text-red-600" },
};

const emptyForm = {
  title: "",
  location: "",
  date: new Date().toISOString().split("T")[0],
  description: "",
  status: "planned",
};

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);

  const load = () =>
    fetch("/api/trips").then((r) => r.json()).then(setTrips);

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.title || !form.location) return;
    const method = editingId ? "PUT" : "POST";
    const url = editingId ? `/api/trips/${editingId}` : "/api/trips";
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

  const startEdit = (trip: Trip) => {
    setForm({
      title: trip.title,
      location: trip.location,
      date: trip.date.split("T")[0],
      description: trip.description ?? "",
      status: trip.status,
    });
    setEditingId(trip.id);
    setShowForm(true);
  };

  const remove = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    await fetch(`/api/trips/${id}`, { method: "DELETE" });
    load();
  };

  const planned = trips.filter((t) => t.status === "planned");
  const completed = trips.filter((t) => t.status === "completed");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">낚시 일정</h1>
          <p className="text-slate-500 text-sm mt-1">
            예정 {planned.length}건 · 완료 {completed.length}건
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setForm(emptyForm); setEditingId(null); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          일정 추가
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700">{editingId ? "일정 수정" : "일정 추가"}</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">일정명 *</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="예: 5월 정기 낚시"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">장소 *</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                placeholder="예: 충주호 낚시터"
              />
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
              <label className="block text-xs font-medium text-slate-600 mb-1">상태</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
              >
                <option value="planned">예정</option>
                <option value="completed">완료</option>
                <option value="cancelled">취소</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">설명</label>
              <textarea
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="일정 설명 (선택사항)"
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

      {trips.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <Fish className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">등록된 낚시 일정이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip) => {
            const totalExpense = trip.expenses.reduce((s, e) => s + e.amount, 0);
            const { label, color } = STATUS_LABELS[trip.status] ?? STATUS_LABELS.planned;
            return (
              <div key={trip.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
                        {label}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-800">{trip.title}</h3>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => startEdit(trip)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                      <PenLine className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => remove(trip.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-slate-500">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    {trip.location}
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    {formatDate(trip.date)}
                  </div>
                  {trip.description && (
                    <p className="text-xs text-slate-400 pt-1">{trip.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    참가자 {trip._count.participants}명
                  </div>
                  <div className="flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5" />
                    {formatCurrency(totalExpense)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
