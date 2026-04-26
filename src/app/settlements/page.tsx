"use client";

import { useEffect, useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Calculator, ChevronRight, Users, ArrowRight } from "lucide-react";

interface TripSummary {
  id: number;
  title: string;
  location: string;
  date: string;
  expenses: Array<{ amount: number }>;
  _count: { participants: number };
}

interface Balance {
  memberId: number;
  memberName: string;
  paid: number;
  shouldPay: number;
  balance: number;
}

interface Transfer {
  from: string;
  to: string;
  amount: number;
}

interface Settlement {
  trip: { id: number; title: string; location: string; date: string };
  totalExpense: number;
  perPerson: number;
  balances: Balance[];
  transfers: Transfer[];
}

export default function SettlementsPage() {
  const [trips, setTrips] = useState<TripSummary[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [settlement, setSettlement] = useState<Settlement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settlements").then((r) => r.json()).then(setTrips);
  }, []);

  const loadSettlement = async (tripId: number) => {
    if (selected === tripId) {
      setSelected(null);
      setSettlement(null);
      return;
    }
    setSelected(tripId);
    setLoading(true);
    const data = await fetch(`/api/settlements?tripId=${tripId}`).then((r) => r.json());
    setSettlement(data);
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">정산</h1>
        <p className="text-slate-500 text-sm mt-1">완료된 낚시 일정의 비용 정산</p>
      </div>

      {trips.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-12 text-center">
          <Calculator className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">완료된 낚시 일정이 없습니다.</p>
          <p className="text-slate-300 text-xs mt-1">낚시 일정을 &apos;완료&apos; 상태로 변경하면 여기서 정산할 수 있습니다.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => {
            const totalExpense = trip.expenses.reduce((s, e) => s + e.amount, 0);
            const perPerson = trip._count.participants > 0
              ? Math.ceil(totalExpense / trip._count.participants)
              : 0;
            const isOpen = selected === trip.id;

            return (
              <div key={trip.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <button
                  onClick={() => loadSettlement(trip.id)}
                  className="w-full flex items-center justify-between p-5 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="space-y-1">
                    <h3 className="font-semibold text-slate-800">{trip.title}</h3>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span>{trip.location}</span>
                      <span>{formatDate(trip.date)}</span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {trip._count.participants}명
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-700">{formatCurrency(totalExpense)}</div>
                      <div className="text-xs text-slate-400">1인당 {formatCurrency(perPerson)}</div>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-slate-100 p-5 space-y-5 bg-slate-50">
                    {loading ? (
                      <div className="text-center text-slate-400 py-4 text-sm">계산 중...</div>
                    ) : settlement && (
                      <>
                        <div>
                          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">개인별 납부 내역</h4>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            {settlement.balances.map((b) => (
                              <div key={b.memberId} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-xs">
                                    {b.memberName[0]}
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-slate-700">{b.memberName}</div>
                                    <div className="text-xs text-slate-400">실지출 {formatCurrency(b.paid)}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className={`text-sm font-bold ${b.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                                    {b.balance >= 0 ? "+" : ""}{formatCurrency(b.balance)}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    {b.balance >= 0 ? "받을 금액" : "낼 금액"}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {settlement.transfers.length > 0 && (
                          <div>
                            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">정산 방법</h4>
                            <div className="space-y-2">
                              {settlement.transfers.map((t, i) => (
                                <div key={i} className="bg-white rounded-lg border border-slate-200 p-3 flex items-center gap-3">
                                  <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center text-red-700 font-semibold text-xs">
                                    {t.from[0]}
                                  </div>
                                  <span className="text-sm text-slate-600 font-medium">{t.from}</span>
                                  <ArrowRight className="w-4 h-4 text-slate-400" />
                                  <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-green-700 font-semibold text-xs">
                                    {t.to[0]}
                                  </div>
                                  <span className="text-sm text-slate-600 font-medium">{t.to}</span>
                                  <span className="ml-auto text-sm font-bold text-slate-800">
                                    {formatCurrency(t.amount)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {settlement.transfers.length === 0 && settlement.balances.length > 0 && (
                          <div className="text-center text-slate-400 text-sm py-2">
                            정산이 완료되었거나 참가자 지출이 균등합니다.
                          </div>
                        )}

                        {settlement.balances.length === 0 && (
                          <div className="text-center text-slate-400 text-sm py-2">
                            참가자를 먼저 등록해주세요.
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
