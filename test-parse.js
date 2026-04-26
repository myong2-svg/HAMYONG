const XLSX = require('xlsx');
const fs = require('fs');

const MONTHLY_FEE = 30000;
const SKIP_NAMES = new Set(['찬조','지출','은행이자','세이프박스','잔액','총액','합계','']);

function isSkipRow(name) {
  return SKIP_NAMES.has(name.trim()) || /^(지출|이자|잔액|총액|합계)/.test(name.trim());
}
function parseMonthHeader(h) {
  const m = String(h ?? '').match(/^(\d{1,2})월$/);
  return m ? parseInt(m[1]) : null;
}
function extractYear(name) {
  const m = name.trim().match(/^(20\d{2})\s*(년\s*도?)?$/);
  return m ? parseInt(m[1]) : null;
}
function extractTripDate(name) {
  let m = name.match(/^(\d{2})\.(\d{2})\.(\d{2})/);
  if (m) return new Date(2000+parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3]));
  m = name.match(/^(20\d{2})\.(\d{2})\.(\d{2})/);
  if (m) return new Date(parseInt(m[1]), parseInt(m[2])-1, parseInt(m[3]));
  return null;
}

const buf = fs.readFileSync('E:/자금관리/낚시모임회계(문창호환자들).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });
console.log('시트목록:', wb.SheetNames);

for (const sheetName of wb.SheetNames) {
  const year = extractYear(sheetName);
  const tripDate = extractTripDate(sheetName);

  if (year) {
    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

    let headerRowIdx = -1;
    for (let i = 0; i < Math.min(10, raw.length); i++) {
      if (raw[i].some(c => String(c).includes('성명') || String(c).includes('이름'))) {
        headerRowIdx = i; break;
      }
    }
    if (headerRowIdx < 0) { console.log(sheetName + ': 헤더 없음'); continue; }

    const headerRow = raw[headerRowIdx];
    const nameColIdx = headerRow.findIndex(h => String(h).includes('성명') || String(h).includes('이름'));
    const numColIdx = nameColIdx > 0 ? nameColIdx - 1 : 0;

    const monthCols = new Map();
    headerRow.forEach((h, idx) => { const m = parseMonthHeader(h); if (m) monthCols.set(idx, m); });

    let members = [], fees = 0, skipped = 0,납부Count = 0;
    for (let ri = headerRowIdx + 1; ri < raw.length; ri++) {
      const row = raw[ri];
      const numCell = row[numColIdx];
      const nameCell = String(row[nameColIdx] ?? '').trim();
      if (!nameCell || isSkipRow(nameCell)) continue;
      if (typeof numCell !== 'number' && !/^\d+$/.test(String(numCell))) { skipped++; continue; }
      members.push(nameCell);
      monthCols.forEach((month, ci) => {
        const val = row[ci];
        if (String(val).trim() === '납부') { 납부Count++; fees++; return; }
        const amt = typeof val === 'number' ? val : 0;
        if (amt > 0) fees += Math.round(amt / MONTHLY_FEE);
      });
    }
    console.log(`[연도시트] ${sheetName}: 회원=${members.length}(${members.slice(0,3).join(',')}...), 회비=${fees}, 납부셀=${납부Count}, 번호스킵=${skipped}, 월컬럼=${monthCols.size}`);

  } else if (tripDate) {
    const ws = wb.Sheets[sheetName];
    const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    const SKIP_CELLS = new Set(['회비','잔금','조식','찬조','총금액','합계','소계','잔액']);
    let title = sheetName, participants = [], expenses = [];
    for (const row of raw) {
      const c0 = String(row[0] ?? '').trim();
      if (c0 && c0.length < 30) { title = c0; break; }
    }
    for (const row of raw) {
      const c0 = String(row[0] ?? '').trim();
      if (!c0 || SKIP_CELLS.has(c0)) continue;
      const amts = row.map(v => typeof v === 'number' ? v : (parseInt(String(v||'0').replace(/[^0-9]/g,''))||0)).filter(v=>v>0&&v<1e8);
      const amt = amts[0] ?? 0;
      if (amt === 0) {
        if (c0.length >= 2 && c0.length <= 10 && !/^\d/.test(c0)) participants.push(c0);
      } else {
        expenses.push({ title: c0, amount: amt });
      }
    }
    console.log(`[일정시트] ${sheetName}: 제목="${title}", 참가자=${participants.join(',')}, 지출=${expenses.map(e=>e.title+'('+e.amount+')').join(',')}`);
  } else {
    console.log(`[미인식] ${sheetName}`);
  }
}
