# -*- coding: utf-8 -*-
"""Nạp slide THẬT từ data pack vào ứng dụng.

    python codebase/ingest_slides.py

Làm hai việc cho mỗi trang PDF trong `data/vlearn-pack/slides/`:
  1. Trích text -> `codebase/slides.json`  (ngữ cảnh cho quiz_ai ra đề)
  2. Kết xuất ảnh -> `codebase/slides/<material_id>/<trang>.webp`  (để hiển thị)

Trước đây chỉ 4 trang (36-39) có nội dung viết tay trong slides.json, nên mọi
trang khác đều bị AI trả `thieu_can_cu`. Sau khi chạy script này, cả 58 trang
đều có nội dung thật.

**Bảo mật:** ảnh và text sinh ra từ data pack -> KHÔNG commit. Xem .gitignore.
"""
from __future__ import annotations

import io
import json
import re
import sys
from pathlib import Path

import fitz  # PyMuPDF

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
PDF_DIR = REPO / "data" / "vlearn-pack" / "slides"
IMG_DIR = ROOT / "slides"
SLIDES_JSON = ROOT / "slides.json"

# PDF nào ứng với material nào trong giao diện.
BO_SLIDE = {
    "d1-slide-hackathon.pdf": {
        "material_id": "material_d1_hackathon",
        "ten": "d1-slide-hackathon.pdf",
        "day": "Day 1",
    },
    "d2-slide-hackathon.pdf": {
        "material_id": "material_d2_hackathon",
        "ten": "d2-slide-hackathon.pdf",
        "day": "Day 2",
    },
}

DPI = 110  # đủ nét để đọc trên màn hình, file không quá nặng


def don_text(t: str) -> str:
    """Gộp dòng vụn của PDF thành đoạn đọc được, bỏ khoảng trắng thừa."""
    t = t.replace("\r", "\n")
    t = re.sub(r"[ \t]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    dong = [d.strip() for d in t.split("\n")]
    return "\n".join(d for d in dong if d).strip()


def main() -> int:
    if not PDF_DIR.exists():
        print(f"Khong tim thay {PDF_DIR}")
        return 1

    IMG_DIR.mkdir(exist_ok=True)
    # Giữ lại nội dung viết tay cũ (trang 36-39 của bộ demo) nếu có.
    du_lieu = {}
    if SLIDES_JSON.exists():
        try:
            du_lieu = json.loads(SLIDES_JSON.read_text(encoding="utf-8"))
        except Exception:
            du_lieu = {}
    du_lieu["_ghi_chu"] = (
        "Nội dung slide dùng chung cho server.py và eval/run_eval.py. "
        "Phần material_d1/d2 sinh tự động từ data pack bằng ingest_slides.py — "
        "KHÔNG commit thư mục codebase/slides/."
    )

    muc_luc = {}
    for ten_pdf, cau_hinh in BO_SLIDE.items():
        p = PDF_DIR / ten_pdf
        if not p.exists():
            print(f"  bo qua (khong co): {ten_pdf}")
            continue

        mid = cau_hinh["material_id"]
        doc = fitz.open(p)
        thu_muc_anh = IMG_DIR / mid
        thu_muc_anh.mkdir(parents=True, exist_ok=True)

        trang_map = {}
        rong = 0
        for i, page in enumerate(doc, start=1):
            txt = don_text(page.get_text())
            if len(txt) < 25:
                rong += 1
            trang_map[str(i)] = txt

            pix = page.get_pixmap(dpi=DPI)
            f = thu_muc_anh / f"{i}.webp"
            # webp nhe hon png nhieu ma van net o muc DPI nay
            pix.pil_save(f, format="WEBP", quality=82)

        du_lieu[mid] = trang_map
        muc_luc[mid] = {
            "ten": cau_hinh["ten"],
            "day": cau_hinh["day"],
            "so_trang": len(doc),
            "thu_muc_anh": f"slides/{mid}",
        }
        tong_kb = sum(f.stat().st_size for f in thu_muc_anh.iterdir()) // 1024
        print(f"  {ten_pdf}: {len(doc)} trang | {rong} trang it chu | anh {tong_kb} KB")
        doc.close()

    SLIDES_JSON.write_text(
        json.dumps(du_lieu, ensure_ascii=False, indent=2), encoding="utf-8")
    (ROOT / "slides-index.json").write_text(
        json.dumps(muc_luc, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"\nDa ghi: {SLIDES_JSON.name} ({SLIDES_JSON.stat().st_size // 1024} KB)")
    print(f"Da ghi: slides-index.json")
    print(f"Anh o: {IMG_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
