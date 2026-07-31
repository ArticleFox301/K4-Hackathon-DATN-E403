# -*- coding: utf-8 -*-
"""Tái tạo mọi con số trong spec.md §1. Chỉ đọc, không sửa gì.

    python eval/mine_evidence.py

Người chấm chạy lệnh này phải ra đúng các số trong spec. Không khớp thì spec sai.
"""
import io
import json
import re
import sys
from pathlib import Path

import pandas as pd

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

CSV = Path(__file__).resolve().parent.parent / "data" / "vlearn-pack" / "chatlog" \
    / "chat_history_anonymized_for_hackathon.csv"

df = pd.read_csv(CSV)
stu = df[df.role == "student"]
tut = df[df.role == "tutor"]

print("=" * 62)
print("PHAM VI DU LIEU")
print("=" * 62)
print(f"  dong={len(df)}  luot(turn)={df.turn_id.nunique()}  "
      f"hoc vien={df.user_id.nunique()}  hoi thoai={df.conversation_id.nunique()}")
print(f"  thoi gian: {df.message_created_at.min()} -> {df.message_created_at.max()}")

print("\n" + "=" * 62)
print("BANG BANG CHUNG spec.md §1  (quy tac dem ghi ngay duoi moi dong)")
print("=" * 62)

# --- Tutor khong bao gio kiem tra hieu ---
n_check = int((df.asked_check_question == True).sum())  # noqa: E712
print(f"\n1. asked_check_question = True : {n_check} / {len(df)}  "
      f"({n_check/len(df)*100:.2f}%)")
print("   Quy tac: dem thang cot boolean tren toan bo dong.")

n_val = int((tut.move_used == "validate_understanding").sum())
print(f"\n2. move_used = validate_understanding : {n_val} / {len(tut)}  "
      f"({n_val/len(tut)*100:.2f}%)")
print("   Quy tac: chi dem tren dong role=tutor (student luon null).")

n_rev = int((tut.move_used == "review_concept").sum())
print(f"\n3. move_used = review_concept : {n_rev} / {len(tut)}  "
      f"({n_rev/len(tut)*100:.1f}%)")

n_mis = int(tut.misconceptions.fillna("[]").map(
    lambda x: len(json.loads(x)) if str(x).strip().startswith("[") else 0).sum())
print(f"\n4. Tong so misconception duoc ghi nhan : {n_mis} / {len(tut)}")
print("   Quy tac: parse JSON tung o, cong do dai list.")


def n_cite(x):
    try:
        v = json.loads(x) if isinstance(x, str) else []
        return len(v) if isinstance(v, list) else 0
    except Exception:
        return 0


c = tut.citations.map(n_cite)
print(f"\n5. citations rong : {int((c == 0).sum())} / {len(tut)}  "
      f"({(c == 0).mean()*100:.1f}%)")
print(f"   Trong so cau CO trich dan (n={int((c > 0).sum())}): "
      f"chi 1 trang = {int((c == 1).sum())} ({(c[c>0] == 1).mean()*100:.1f}%)")

up = int((df.rating == "up").sum())
dn = int((df.rating == "down").sum())
dn_rev = int((df[(df.rating == "down")].move_used == "review_concept").sum())
print(f"\n6. rating : up={up}  down={dn}   "
      f"(trong {dn} luot bi che, {dn_rev} roi vao review_concept)")

# --- Nhu cau chu dong: hoc vien tu xin quiz ---
print("\n" + "=" * 62)
print("HOC VIEN TU XIN KIEM TRA HIEU (quote nguyen van trong spec §1)")
print("=" * 62)
P = r"quiz|trac nghiem|trắc nghiệm|kiểm tra|cau hoi de|câu hỏi để|on lai|ôn lại"
m = stu.content.fillna("").str.lower().str.contains(P, regex=True, na=False)
sub = stu[m.values]
print(f"  {int(m.sum())}/{len(stu)} tin nhan  |  {sub.user_id.nunique()} hoc vien")
for mid in ["M0003", "M0217", "M0872"]:
    r = df[df.message_id == mid]
    if len(r):
        t = re.sub(r"\s+", " ", str(r.iloc[0].content))
        print(f"    {mid} (tr?) : {t[:110]}")

# --- Phan bo dau vao that: co so cho 4 lop cho kho ---
print("\n" + "=" * 62)
print("DAU VAO THAT -> co so chon 4 lop cho kho (spec §5)")
print("=" * 62)
pat = re.compile(r'^\(Trang\s+(\d+),\s*đoạn được chọn:\s*"(.*?)"\)\s*(.*)$', re.S)
rows = []
for _, r in stu.iterrows():
    mm = pat.match(str(r.content or ""))
    if mm:
        rows.append({"mid": r.message_id, "uid": r.user_id,
                     "boiden": re.sub(r"\s+", " ", mm.group(2)),
                     "hoi": re.sub(r"\s+", " ", mm.group(3))})
d = pd.DataFrame(rows)
print(f"  Tin nhan co neo trang : {len(d)}/{len(stu)} ({len(d)/len(stu)*100:.1f}%)")
print(f"  Lop 2 - cau hoi cut (<=12 ky tu)      : {int((d.hoi.str.len() <= 12).sum())} "
      f"tu {d[d.hoi.str.len() <= 12].uid.nunique()} hoc vien")
print(f"  Lop 2 - doan boi den qua ngan (<=15)  : {int((d.boiden.str.len() <= 15).sum())}")
P1 = r"ngoài|khác|còn gì|thêm|liên quan|so sánh|khác nhau|phân biệt|tại sao|vì sao"
print(f"  Lop 1 - hoi ngoai doan da chon        : "
      f"{int(d.hoi.str.lower().str.contains(P1, na=False, regex=True).sum())}")
P3 = r"đáp án|làm hộ|làm giúp|giải hộ|bài kiểm tra|bài thi|bài lab"
print(f"  Lop 3 - doi dap an / lam ho           : "
      f"{int(d.hoi.str.lower().str.contains(P3, na=False, regex=True).sum())}")
PB = r"\bko\b|\bhok\b|\bdc\b|\bđc\b|\bz\b|\bj\b|dợ|zậy|slice|thek"
print(f"  Dau vao ban (teencode/sai chinh ta)   : "
      f"{int(d.hoi.str.lower().str.contains(PB, na=False, regex=True).sum())}")

print("\nXong. Moi so tren doi chieu duoc voi spec.md §1.")
