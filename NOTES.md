# 낚시모임 회계 앱 개발 노트

## 프로젝트 개요
**문창호 환자들** 낚시모임 재정 관리 웹앱  
경로: `C:\Users\myong\fishing-club`  
실행: `npm run dev` → http://localhost:3000

## 기술 스택
- **Framework**: Next.js 16.2.4 (App Router), React 19
- **DB**: SQLite + Prisma 7.8.0 (better-sqlite3)
- **UI**: Tailwind CSS v4, lucide-react
- **Excel 파싱**: xlsx 0.18.5, xlsx-populate 1.21.0 (카카오뱅크 암호화 해제용)

---

## 데이터 모델 (prisma/schema.prisma)

```
Member       id, name, phone, email, address, birthDate, bankInfo, joinDate, role(member/admin), active, note
Fee          id, memberId, amount, year, month, status(paid/unpaid), paidAt, note
Expense      id, title, amount, category, date, description, paidById(→Member), tripId(→Trip)
Trip         id, title, location, date, description, status(planned/completed)
TripParticipant  tripId, memberId (unique pair)
Setting      key, value (문자열 upsert)
```

---

## API 엔드포인트

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | /api/dashboard | 대시보드 통계 |
| GET/POST | /api/members | 회원 목록 / 추가 |
| PUT/DELETE | /api/members/[id] | 회원 수정 / **완전 삭제** (관련 회비·참가기록 cascade) |
| GET/POST | /api/fees | 회비 조회 / 등록 |
| PUT/DELETE | /api/fees/[id] | 회비 납부상태 변경 / 삭제 |
| GET/POST | /api/expenses | 지출 목록 / 추가 |
| PUT/DELETE | /api/expenses/[id] | 지출 수정 / 삭제 |
| GET/POST | /api/trips | 낚시 일정 목록 / 추가 |
| PUT/DELETE | /api/trips/[id] | 일정 수정 / 삭제 |
| GET/PUT | /api/settings | 설정값 조회/저장 (key-value upsert) |
| POST/PUT | /api/import/club | 낚시모임 Excel 가져오기 / 미리보기 |
| POST/PUT | /api/import/kakaobank | 카카오뱅크 Excel 가져오기 / 미리보기 |
| GET | /api/export | 데이터 내보내기 |

---

## Setting 테이블 키

| key | 설명 |
|-----|------|
| `safebox` | 세이프박스 금액 (수동 입력) |
| `account_balance` | 통장잔액 (수동, 0이면 자동 계산) |
| `unpaid_amount` | 총 미납금 표시값 (수동) |
| `admin_password` | 대시보드 관리자 비밀번호 |
| `unpaid_mid_{memberId}` | 회원별 미납금 override |

---

## 핵심 로직

### 1. 회비 조회 (GET /api/fees?year=&month=)
특정 월 조회 시 **활성 회원 전체를 기준**으로 반환:
- 기록 있는 회원: 실제 DB 레코드 (id 있음)
- 기록 없는 회원: 가상 미납 항목 (`id: null`, status: "unpaid")

→ 회비 페이지에서 납부 클릭 시:
- `id === null` → POST로 새 "paid" 레코드 생성
- `id !== null` → PUT으로 기존 레코드 토글

### 2. 대시보드 미납자 계산
```ts
// joinDate 이후 달만 집계, unpaid_mid_{memberId} override 지원
for (const { year, month } of feeMonths) {
  for (const member of activeMembersWithJoin) {
    if (year < jy || (year === jy && month < jm)) continue; // joinDate 이전 스킵
    if (!paidSet.has(`${member.id}-${year}-${month}`)) {
      unpaidMap.get(member.id)?.months++ // 미납 달수 누적
    }
  }
}
// override 없으면 months × 30,000, 있으면 override 금액
```

### 3. 통장잔액 계산
```ts
const calcAccountBalance = totalFeeCollected - bankExpenses(paidById=null) - safebox;
// account_balance 설정값이 0이 아니면 수동값 사용
const accountBalance = manualAccountBalance !== 0 ? manualAccountBalance : calcAccountBalance;
```
- UI에서 관리자가 수동 입력 가능, `accountBalanceIsManual=true`이면 "초기화" 버튼 표시

### 4. 대시보드 관리자 인증
- sessionStorage `isAdmin=true`로 세션 유지
- `admin_password` 미설정 시 최초 비밀번호 설정 플로우
- 관리자만 세이프박스·통장잔액·미납금 수동 편집 가능

### 5. 회원 삭제 (DELETE /api/members/[id])
실제 삭제 (soft delete 아님). cascade 순서:
```ts
await prisma.tripParticipant.deleteMany({ where: { memberId } });
await prisma.fee.deleteMany({ where: { memberId } });
await prisma.expense.updateMany({ where: { paidById: memberId }, data: { paidById: null } });
await prisma.member.delete({ where: { id: memberId } });
```

---

## Excel 가져오기

### 낚시모임 회계장부 (src/app/api/import/club/route.ts)
**실제 파일**: `E:\자금관리\낚시모임회계(문창호환자들).xlsx`

**시트 분류 로직**:
- 연도 시트: `extractYear()` — "2024", "2024년", "2024년도", "24년" 등 → 회원+회비 파싱
- 일정 시트: `extractTripDate()` — "24.08.30갈치", "25.09.27 문어대회" 등 → 낚시일정 파싱

**연도 시트 구조**:
- col0: 번호, col1: 성명, col2~: 1월~12월
- `parseFeeAmount()`: 숫자 → 그대로 / "납부","O","✓","Y" 등 → 30,000원
- 선납 분할: 90,000 → 3개월, 180,000 → 6개월

**일정 시트 구조**:
- 제목: 첫 셀 길이 5~39자 (≤4자는 이름으로 간주, 스킵)
- 지출: `typeof v === "number"` 셀만 인정 (텍스트 파싱 안 함)

### 카카오뱅크 거래내역 (src/app/api/import/kakaobank/route.ts)
**실제 파일**: `C:\Users\myong\Downloads\카카오뱅크_거래내역_*.xlsx` / **비밀번호**: 871201

- xlsx-populate로 복호화 → xlsx로 파싱
- `findHeaderRow()`: 최대 20행 스캔해서 날짜 컬럼 있는 행 탐색
- `거래구분` "세이프박스","예금이자","캐시백" → 스킵
- `내용` 컬럼 송금자 이름 → `matchMember()`로 회원 매칭

---

## 파일 구조

```
fishing-club/
├── prisma/schema.prisma
├── src/app/
│   ├── page.tsx              # 대시보드 (관리자 인증, 세이프박스·통장잔액·미납금 수동편집)
│   ├── members/page.tsx
│   ├── fees/page.tsx
│   ├── expenses/page.tsx
│   ├── trips/page.tsx
│   ├── import/page.tsx
│   └── api/
│       ├── dashboard/route.ts
│       ├── members/route.ts + [id]/route.ts
│       ├── fees/route.ts + [id]/route.ts
│       ├── expenses/route.ts + [id]/route.ts
│       ├── trips/route.ts + [id]/route.ts
│       ├── settings/route.ts
│       ├── import/club/route.ts
│       └── import/kakaobank/route.ts
├── src/lib/prisma.ts
└── src/lib/utils.ts          # formatCurrency, formatDate, EXPENSE_CATEGORY_COLORS
```

---

## 현재 DB 상태 (2026-04-26 기준)
- 활성 회원 14명: 정하명, 박명준, 서증길, 김성식, 손혜경, 박성규, 홍미희, 송문창, 공태겸, 이재서, 송서범, 최진영, 김정환, 정유성
- 비활성: 박순갑, 구상회(정명선)
- 총 회비 수입: ₩7,830,000
- 2026년 4월 기준 미납: 박명준, 서증길, 박성규, 김정환

## 참고 파일 위치
- 낚시모임 회계장부: `E:\자금관리\낚시모임회계(문창호환자들).xlsx`
- 카카오뱅크 내역: `C:\Users\myong\Downloads\카카오뱅크_거래내역_*.xlsx` (비번: 871201)
