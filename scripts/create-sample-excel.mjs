import * as XLSX from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 회원 시트
const members = [
  ["이름", "연락처", "이메일", "주소", "생년월일", "계좌번호", "가입일", "비고"],
  ["홍길동", "010-1111-2222", "hong@test.com", "서울시 강남구 역삼동", "1985-03-15", "국민 123-45-678901", "2023-01-01", ""],
  ["김철수", "010-3333-4444", "kim@test.com", "경기도 성남시 분당구", "1990-07-20", "신한 234-56-789012", "2023-03-01", "낚시 베테랑"],
  ["이영희", "010-5555-6666", "", "부산시 해운대구", "1988-11-05", "", "2023-06-01", ""],
];

// 회비 시트
const fees = [
  ["이름", "년도", "월", "금액", "납부여부", "납부일"],
  ["홍길동", 2026, 1, 30000, "납부", "2026-01-05"],
  ["김철수", 2026, 1, 30000, "납부", "2026-01-10"],
  ["이영희", 2026, 1, 30000, "미납", ""],
  ["홍길동", 2026, 2, 30000, "납부", "2026-02-03"],
  ["김철수", 2026, 2, 30000, "미납", ""],
  ["이영희", 2026, 2, 30000, "미납", ""],
];

// 지출 시트
const expenses = [
  ["항목", "금액", "카테고리", "날짜", "결제자", "설명"],
  ["낚시터 입장료", 80000, "낚시터", "2026-03-15", "홍길동", "3월 정기 낚시"],
  ["점심 식사", 45000, "식비", "2026-03-15", "김철수", ""],
  ["낚시 미끼 구매", 25000, "장비", "2026-03-15", "홍길동", ""],
  ["주유비", 60000, "교통", "2026-03-15", "이영희", ""],
];

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(members), "회원명단");
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(fees), "회비내역");
XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(expenses), "지출내역");

const outPath = path.join(__dirname, "..", "public", "sample-import.xlsx");
XLSX.writeFile(wb, outPath);
console.log("샘플 파일 생성:", outPath);
