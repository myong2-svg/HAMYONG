"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/utils";
import { UserPlus, Phone, Mail, Shield, User, PenLine, X, MapPin, ChevronDown, Lock, Unlock } from "lucide-react";
import { useAdminAuth } from "@/lib/useAdminAuth";

interface Member {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  birthDate: string | null;
  bankInfo: string | null;
  note: string | null;
  role: string;
  active: boolean;
  joinDate: string;
}

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  address: "",
  birthDate: "",
  bankInfo: "",
  note: "",
  role: "member",
  joinDate: new Date().toISOString().split("T")[0],
};

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const {
    isAdmin, showModal, passwordInput, setPasswordInput,
    error, storedPass, setupInput, setSetupInput,
    setupConfirm, setSetupConfirm, setupError,
    openModal, closeModal, verify, setup, logout,
  } = useAdminAuth();

  const load = () =>
    fetch("/api/members").then((r) => r.json()).then(setMembers);

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.name.trim()) return;
    if (editingId) {
      await fetch(`/api/members/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }
    setShowForm(false);
    setForm(emptyForm);
    setEditingId(null);
    load();
  };

  const startEdit = (m: Member) => {
    setForm({
      name: m.name,
      phone: m.phone ?? "",
      email: m.email ?? "",
      address: m.address ?? "",
      birthDate: m.birthDate ?? "",
      bankInfo: m.bankInfo ?? "",
      note: m.note ?? "",
      role: m.role,
      joinDate: m.joinDate.split("T")[0],
    });
    setEditingId(m.id);
    setShowForm(true);
    setExpandedId(null);
  };

  const deleteMember = async (id: number) => {
    if (!confirm("회원을 삭제하시겠습니까?\n관련 회비 내역도 함께 삭제됩니다.")) return;
    await fetch(`/api/members/${id}`, { method: "DELETE" });
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const active = members.filter(m => m.active);
  const inactive = members.filter(m => !m.active);

  return (
    <div className="space-y-6">
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
          <h1 className="text-2xl font-bold text-slate-800">회원 관리</h1>
          <p className="text-slate-500 text-sm mt-1">활성 {active.length}명 · 비활성 {inactive.length}명</p>
        </div>
        <div className="flex items-center gap-2">
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
          {isAdmin && (
            <button
              onClick={() => { setShowForm(true); setForm(emptyForm); setEditingId(null); }}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              회원 추가
            </button>
          )}
        </div>
      </div>

      {/* 추가/수정 폼 */}
      {showForm && isAdmin && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700">
              {editingId ? "회원 수정" : "새 회원 추가"}
            </h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">이름 *</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="홍길동"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">연락처</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="010-0000-0000"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">이메일</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="example@email.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">생년월일</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.birthDate}
                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                placeholder="1990-01-01"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">주소</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="서울시 강남구 ..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">계좌번호</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.bankInfo}
                onChange={(e) => setForm({ ...form, bankInfo: e.target.value })}
                placeholder="국민 123-456-789012"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">가입일</label>
              <input
                type="date"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.joinDate}
                onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">역할</label>
              <select
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
              >
                <option value="member">일반 회원</option>
                <option value="admin">관리자</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">비고</label>
              <input
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.target.value })}
                placeholder="메모 (선택사항)"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="px-4 py-2 text-sm text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200"
            >
              취소
            </button>
            <button
              onClick={submit}
              className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              {editingId ? "저장" : "추가"}
            </button>
          </div>
        </div>
      )}

      {/* 회원 목록 */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">이름</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">연락처</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">이메일</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">역할</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">가입일</th>
              <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3">상태</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-10 text-slate-400 text-sm">
                  등록된 회원이 없습니다.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <>
                  <tr
                    key={m.id}
                    className={`hover:bg-slate-50 cursor-pointer ${!m.active ? "opacity-50" : ""}`}
                    onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm shrink-0">
                          {m.name[0]}
                        </div>
                        <span className="font-medium text-slate-800 text-sm">{m.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        {m.phone && <><Phone className="w-3 h-3" /> {m.phone}</>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        {m.email && <><Mail className="w-3 h-3" /> {m.email}</>}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-600"
                      }`}>
                        {m.role === "admin" ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {m.role === "admin" ? "관리자" : "일반 회원"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500">{formatDate(m.joinDate)}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        m.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                      }`}>
                        {m.active ? "활성" : "비활성"}
                      </span>
                    </td>
                    <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => startEdit(m)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            >
                              <PenLine className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteMember(m.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 text-slate-300 transition-transform ${expandedId === m.id ? "rotate-180" : ""}`} />
                      </div>
                    </td>
                  </tr>
                  {expandedId === m.id && (
                    <tr key={`${m.id}-detail`} className="bg-slate-50">
                      <td colSpan={7} className="px-5 py-4">
                        <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                          <div className="flex gap-2">
                            <span className="text-slate-400 shrink-0">주소</span>
                            <span className="text-slate-700 flex items-center gap-1">
                              {m.address ? <><MapPin className="w-3 h-3 text-slate-400" />{m.address}</> : "—"}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-slate-400 shrink-0">생년월일</span>
                            <span className="text-slate-700">{m.birthDate || "—"}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-slate-400 shrink-0">계좌번호</span>
                            <span className="text-slate-700">{m.bankInfo || "—"}</span>
                          </div>
                          {m.note && (
                            <div className="flex gap-2 col-span-2 sm:col-span-3">
                              <span className="text-slate-400 shrink-0">비고</span>
                              <span className="text-slate-700">{m.note}</span>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
