"""
기존 SQLite 데이터를 Supabase(PostgreSQL)용 SQL로 내보내는 스크립트

사용법:
  1. Next.js 앱 먼저 종료 (Ctrl+C)
  2. python scripts/export-to-sql.py
  3. 생성된 data-export.sql 파일을 Supabase > SQL Editor에서 실행
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "dev.db")
OUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data-export.sql")

def q(val):
    if val is None:
        return "NULL"
    if isinstance(val, bool):
        return "true" if val else "false"
    if isinstance(val, int):
        return str(val)
    s = str(val).replace("'", "''")
    return f"'{s}'"

conn = sqlite3.connect(DB_PATH)
conn.row_factory = sqlite3.Row
c = conn.cursor()

lines = []
lines.append("-- 기존 데이터 마이그레이션 (Supabase SQL Editor에서 실행)\n")

# Member
rows = c.execute("SELECT * FROM Member ORDER BY id").fetchall()
if rows:
    lines.append("-- Member")
    for r in rows:
        cols = dict(r)
        lines.append(
            f"INSERT INTO \"Member\" (id, name, phone, email, address, \"birthDate\", \"bankInfo\", \"joinDate\", role, active, note, \"createdAt\", \"updatedAt\") VALUES ("
            f"{q(cols['id'])}, {q(cols['name'])}, {q(cols['phone'])}, {q(cols['email'])}, {q(cols['address'])}, "
            f"{q(cols['birthDate'])}, {q(cols['bankInfo'])}, {q(cols['joinDate'])}, {q(cols['role'])}, "
            f"{q(bool(cols['active']))}, {q(cols['note'])}, {q(cols['createdAt'])}, {q(cols.get('updatedAt', cols['createdAt']))})"
            f" ON CONFLICT (id) DO NOTHING;"
        )
    lines.append(f"SELECT setval('\"Member_id_seq\"', (SELECT MAX(id) FROM \"Member\"));\n")

# Fee
rows = c.execute("SELECT * FROM Fee ORDER BY id").fetchall()
if rows:
    lines.append("-- Fee")
    for r in rows:
        cols = dict(r)
        lines.append(
            f"INSERT INTO \"Fee\" (id, \"memberId\", amount, year, month, status, \"paidAt\", note, \"createdAt\") VALUES ("
            f"{q(cols['id'])}, {q(cols['memberId'])}, {q(cols['amount'])}, {q(cols['year'])}, {q(cols['month'])}, "
            f"{q(cols['status'])}, {q(cols['paidAt'])}, {q(cols['note'])}, {q(cols['createdAt'])})"
            f" ON CONFLICT (id) DO NOTHING;"
        )
    lines.append(f"SELECT setval('\"Fee_id_seq\"', (SELECT MAX(id) FROM \"Fee\"));\n")

# Trip
rows = c.execute("SELECT * FROM Trip ORDER BY id").fetchall()
if rows:
    lines.append("-- Trip")
    for r in rows:
        cols = dict(r)
        lines.append(
            f"INSERT INTO \"Trip\" (id, title, location, date, description, status, \"createdAt\") VALUES ("
            f"{q(cols['id'])}, {q(cols['title'])}, {q(cols['location'])}, {q(cols['date'])}, "
            f"{q(cols['description'])}, {q(cols['status'])}, {q(cols['createdAt'])})"
            f" ON CONFLICT (id) DO NOTHING;"
        )
    lines.append(f"SELECT setval('\"Trip_id_seq\"', (SELECT MAX(id) FROM \"Trip\"));\n")

# Expense
rows = c.execute("SELECT * FROM Expense ORDER BY id").fetchall()
if rows:
    lines.append("-- Expense")
    for r in rows:
        cols = dict(r)
        lines.append(
            f"INSERT INTO \"Expense\" (id, title, amount, category, date, description, \"paidById\", \"tripId\", \"createdAt\") VALUES ("
            f"{q(cols['id'])}, {q(cols['title'])}, {q(cols['amount'])}, {q(cols['category'])}, {q(cols['date'])}, "
            f"{q(cols['description'])}, {q(cols['paidById'])}, {q(cols['tripId'])}, {q(cols['createdAt'])})"
            f" ON CONFLICT (id) DO NOTHING;"
        )
    lines.append(f"SELECT setval('\"Expense_id_seq\"', (SELECT MAX(id) FROM \"Expense\"));\n")

# TripParticipant
rows = c.execute("SELECT * FROM TripParticipant ORDER BY id").fetchall()
if rows:
    lines.append("-- TripParticipant")
    for r in rows:
        cols = dict(r)
        lines.append(
            f"INSERT INTO \"TripParticipant\" (id, \"tripId\", \"memberId\", paid, amount) VALUES ("
            f"{q(cols['id'])}, {q(cols['tripId'])}, {q(cols['memberId'])}, {q(bool(cols['paid']))}, {q(cols['amount'])})"
            f" ON CONFLICT (id) DO NOTHING;"
        )
    lines.append(f"SELECT setval('\"TripParticipant_id_seq\"', (SELECT MAX(id) FROM \"TripParticipant\"));\n")

# Setting
rows = c.execute("SELECT * FROM Setting").fetchall()
if rows:
    lines.append("-- Setting")
    for r in rows:
        cols = dict(r)
        lines.append(
            f"INSERT INTO \"Setting\" (key, value) VALUES ({q(cols['key'])}, {q(cols['value'])})"
            f" ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;"
        )

conn.close()

with open(OUT_PATH, "w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print(f"완료! {OUT_PATH} 파일을 Supabase SQL Editor에서 실행하세요.")
