export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency: "KRW",
  }).format(amount);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(date));
}

export const EXPENSE_CATEGORIES = [
  "낚시터",
  "식비",
  "장비",
  "교통",
  "기타",
] as const;

export const EXPENSE_CATEGORY_COLORS: Record<string, string> = {
  낚시터: "bg-blue-100 text-blue-800",
  식비: "bg-green-100 text-green-800",
  장비: "bg-purple-100 text-purple-800",
  교통: "bg-yellow-100 text-yellow-800",
  기타: "bg-gray-100 text-gray-800",
};
