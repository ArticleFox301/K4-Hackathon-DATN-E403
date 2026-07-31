# -*- coding: utf-8 -*-
"""Sinh demo-slides.pdf — 6 trang, khổ 16:9, bám phong cách deck Venture Arena.

    python scripts/make_demo_slides.py

Vì sao sinh bằng script thay vì gõ tay trong PowerPoint: mọi con số trên slide
đều phải khớp với file trong repo. Để rời ra thì sửa eval xong quên sửa slide,
lúc demo đọc một đằng repo ghi một nẻo. Muốn đổi số thì sửa ở KHOI NOI DUNG bên
dưới rồi chạy lại, cả bộ ra một lượt.

Chỉ dùng PyMuPDF + Pillow — hai thứ đã có sẵn cho ingest_slides.py, không cài thêm.
"""
from __future__ import annotations

import io
import sys
from pathlib import Path

import fitz  # PyMuPDF
from PIL import Image

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent
RA = ROOT / "demo-slides.pdf"

# Khổ 16:9 chuẩn của PowerPoint: 13,333 x 7,5 inch = 960 x 540 pt.
W, H = 960.0, 540.0
LE = 46.0                      # lề trái/phải

# ---------------------------------------------------------------- bảng màu
# Lấy từ ảnh chụp deck Venture Arena.
NEN_SANG = "#1A3A28"           # góc trên trái
NEN_TOI = "#081310"            # góc dưới phải
KICKER = "#E8734A"             # chữ hoa giãn, màu cam
TIEU_DE = "#F4F1E8"            # kem
PHU_DE = "#F0C04A"             # vàng
CHU = "#C3D2C7"                # thân bài
MO = "#8A9A8E"                 # nhãn phụ, số trang
THE_NEN = "#13251A"
THE_VIEN = "#2B4033"
NHAC_VIEN = "#8A7A3A"          # khung ghi chú vàng ở cuối
NHAC_NEN = "#18200F"

# Màu nhấn ở cạnh trên mỗi thẻ.
VANG, CAM, XANH, LAM, TIM, NGOC = (
    "#E8C05A", "#E07A50", "#6FCF97", "#6BA6E8", "#B08AE0", "#5FD3B0")

FONT = {
    "r": "C:/Windows/Fonts/segoeui.ttf",
    "b": "C:/Windows/Fonts/segoeuib.ttf",
}


def mau(hex_: str):
    h = hex_.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))


def gian(s: str, khoang: str = "\u2009") -> str:
    """Giãn chữ cho dòng kicker. PyMuPDF không có letter-spacing nên chèn tay."""
    return khoang.join(s)


def nen_gradient() -> bytes:
    """Nền chuyển sắc: sáng ở góc trên trái, tối dần xuống dưới phải.

    Tính ở 192x108 rồi phóng to — mắt không thấy khác, mà nhanh hơn tính từng
    pixel ở kích thước thật rất nhiều.
    """
    w, h = 192, 108
    im = Image.new("RGB", (w, h))
    s = tuple(int(NEN_SANG.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    t = tuple(int(NEN_TOI.lstrip("#")[i:i + 2], 16) for i in (0, 2, 4))
    px = im.load()
    cx, cy = w * 0.10, h * 0.02          # tâm nguồn sáng
    xa_nhat = ((w - cx) ** 2 + (h - cy) ** 2) ** 0.5
    for y in range(h):
        for x in range(w):
            d = (((x - cx) ** 2 + (y - cy) ** 2) ** 0.5) / xa_nhat
            d = min(1.0, d ** 0.75)      # ép sáng lan rộng hơn ở gần tâm
            px[x, y] = tuple(int(s[i] + (t[i] - s[i]) * d) for i in range(3))
    # Gradient muợt, không có chi tiết nào để mất — 1x là đủ, và file nhẹ hơn 4 lần.
    im = im.resize((int(W), int(H)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, format="PNG")
    return buf.getvalue()


NEN_PNG = nen_gradient()


class Trang:
    def __init__(self, doc, so: int, tong: int):
        self.p = doc.new_page(width=W, height=H)
        self.p.insert_image(fitz.Rect(0, 0, W, H), stream=NEN_PNG)
        for k, f in FONT.items():
            self.p.insert_font(fontname=k, fontfile=f)
        self.so, self.tong = so, tong
        self.y = 0.0

    # ---------------------------------------------------------- nguyên thuỷ
    def chu(self, x, y, rong, text, *, size=14, font="r", color=CHU,
            cao=None, dong=1.35, align=0):
        cao = cao if cao is not None else size * dong * 6
        r = fitz.Rect(x, y, x + rong, y + cao)
        con = self.p.insert_textbox(r, text, fontname=font, fontsize=size,
                                    color=mau(color), align=align,
                                    lineheight=dong)
        if con < 0:
            print(f"  [tran] trang {self.so}: thiếu {abs(con):.0f}pt cho \"{text[:42]}…\"")
        return con

    def cao_chu(self, text, rong, size, font="r", dong=1.35) -> float:
        """Đo chiều cao thật của một khối chữ bằng cách thử vẽ ra trang nháp."""
        tam = fitz.open()
        pg = tam.new_page(width=W, height=H)
        pg.insert_font(fontname=font, fontfile=FONT[font])
        lo, hi = 6.0, 460.0
        while hi - lo > 1.0:
            giua = (lo + hi) / 2
            if pg.insert_textbox(fitz.Rect(0, 0, rong, giua), text, fontname=font,
                                 fontsize=size, lineheight=dong,
                                 render_mode=3) >= 0:
                hi = giua
            else:
                lo = giua
        tam.close()
        # +3pt khoảng thở: mức tối thiểu đo được vẫn làm insert_textbox báo tràn.
        return hi + 3

    def hop(self, x, y, rong, cao, *, nen=THE_NEN, vien=THE_VIEN, nhan=None, bo=13):
        r = fitz.Rect(x, y, x + rong, y + cao)
        rad = (min(bo / rong, 0.5), min(bo / cao, 0.5))
        self.p.draw_rect(r, color=mau(vien), fill=mau(nen), width=0.9, radius=rad)
        if nhan:
            # Vạch màu ở cạnh trên — dấu nhận dạng của deck gốc.
            v = fitz.Rect(x + bo * 0.5, y - 0.6, x + rong - bo * 0.5, y + 2.4)
            self.p.draw_rect(v, color=None, fill=mau(nhan), width=0,
                             radius=(0.5, 0.5))
        return r

    # ------------------------------------------------------------ bố cục
    def dau_trang(self, kicker, tieu_de, phu_de=None, dan=None):
        self.chu(LE, 28, 520, gian(kicker.upper()), size=10.5, font="b", color=KICKER, cao=22)
        self.chu(W - LE - 320, 28, 320, gian("VENTURE ARENA") + "   " + str(self.so),
                 size=10.5, font="b", color=MO, cao=22, align=2)

        c = self.cao_chu(tieu_de, W - LE * 2, 33, "b", 1.16)
        self.chu(LE, 46, W - LE * 2, tieu_de, size=33, font="b", color=TIEU_DE,
                 cao=c + 4, dong=1.16)
        self.y = 46 + c + 8

        if phu_de:
            c = self.cao_chu(phu_de, W - LE * 2, 15.5, "b", 1.3)
            self.chu(LE, self.y, W - LE * 2, phu_de, size=15.5, font="b",
                     color=PHU_DE, cao=c + 3, dong=1.3)
            self.y += c + 8
        if dan:
            c = self.cao_chu(dan, W - LE * 2, 13.5, "r", 1.45)
            self.chu(LE, self.y, W - LE * 2, dan, size=13.5, color=CHU,
                     cao=c + 3, dong=1.45)
            self.y += c + 10
        self.y += 6

    def hang_the(self, the, *, cao=None, cot=None):
        """Một hàng thẻ đều nhau. `the` = [(tiêu đề, tag, mô tả, màu nhấn), ...]"""
        cot = cot or len(the)
        khe = 16.0
        rong = (W - LE * 2 - khe * (cot - 1)) / cot
        if cao is None:
            cao = 0.0
            for t, _, mo_ta, _ in the:
                cao = max(cao, 52 + self.cao_chu(mo_ta, rong - 34, 12.8, "r", 1.5))
            cao = max(cao, 92)

        for i, (tieu, tag, mo_ta, nhan) in enumerate(the):
            x = LE + i * (rong + khe)
            self.hop(x, self.y, rong, cao, nhan=nhan)
            self.chu(x + 17, self.y + 13, rong - 34, tieu, size=14.5, font="b",
                     color=TIEU_DE, cao=26)
            if tag:
                self.chu(x + 17, self.y + 13, rong - 34, tag, size=14.5, font="b",
                         color=nhan, cao=26, align=2)
            self.chu(x + 17, self.y + 44, rong - 34, mo_ta, size=12.8,
                     color=CHU, cao=cao - 52, dong=1.5)
        self.y += cao + 16
        return cao

    def so_lieu(self, muc):
        """Hàng thẻ số liệu: con số to, nhãn nhỏ ở dưới."""
        khe, cot = 16.0, len(muc)
        rong = (W - LE * 2 - khe * (cot - 1)) / cot
        cao = 0.0
        for _, _, mo_ta, _ in muc:
            cao = max(cao, 92 + self.cao_chu(mo_ta, rong - 34, 12.5, "r", 1.5))
        for i, (so, nhan, mo_ta, m) in enumerate(muc):
            x = LE + i * (rong + khe)
            self.hop(x, self.y, rong, cao, nhan=m)
            self.chu(x + 17, self.y + 13, rong - 34, so, size=29, font="b",
                     color=m, cao=48)
            self.chu(x + 17, self.y + 60, rong - 34, gian(nhan.upper()), size=9,
                     font="b", color=MO, cao=18)
            self.chu(x + 17, self.y + 80, rong - 34, mo_ta, size=12.5,
                     color=CHU, cao=cao - 90, dong=1.5)
        self.y += cao + 16

    def nhac(self, tieu, than):
        cao = 44 + self.cao_chu(than, W - LE * 2 - 34, 12.8, "r", 1.5)
        self.hop(LE, self.y, W - LE * 2, cao, nen=NHAC_NEN, vien=NHAC_VIEN)
        self.chu(LE + 17, self.y + 12, W - LE * 2 - 34, tieu, size=14, font="b",
                 color=PHU_DE, cao=26)
        self.chu(LE + 17, self.y + 38, W - LE * 2 - 34, than, size=12.8,
                 color=CHU, cao=cao - 46, dong=1.5)
        self.y += cao + 14


# ============================================================================
# KHỐI NỘI DUNG — sửa số ở đây rồi chạy lại
# ============================================================================
def dung(doc):
    # ---------------------------------------------------------------- 1. Vấn đề
    t = Trang(doc, 1, 6)
    t.dau_trang(
        "Vấn đề",
        "Tutor giảng lại rất tốt, nhưng gần như không bao giờ hỏi ngược",
        "Học viên tin là mình đã hiểu — lỗ hổng chỉ lộ ra lúc làm lab thì đã muộn",
        "Đếm trên chatlog thật của khoá COMP2010: 2.522 dòng · 1.261 lượt hỏi-đáp · "
        "369 học viên · 585 hội thoại, từ 22–29/07/2026.")
    t.so_lieu([
        ("3 / 2.522", "lượt có hỏi kiểm tra hiểu", "0,12%. Tutor gần như chưa từng "
         "hỏi ngược để đo xem học viên hiểu tới đâu.", XANH),
        ("1 / 1.261", "dùng validate_understanding", "0,08%. Nước đi này có sẵn "
         "trong thiết kế của tutor nhưng không được dùng.", CAM),
        ("1.074 / 1.261", "chỉ giảng lại", "85,2%. Gặp gì cũng giảng lại — tutor "
         "chỉ biết đúng một nước.", VANG),
    ])
    t.nhac("Trường misconceptions tồn tại trong schema, nhưng 0/1.261 lượt từng có giá trị.",
           "Tính năng phát hiện hiểu lầm được thiết kế sẵn rồi bỏ không. Đó là khoảng "
           "trống có thật trong sản phẩm đang chạy, không phải thứ nhóm suy diễn ra.")

    # ------------------------------------------------------------ 2. Bằng chứng
    t = Trang(doc, 2, 6)
    t.dau_trang(
        "Bằng chứng",
        "Học viên đã tự xin thứ này, trong một sản phẩm không có nó",
        "9/1.261 tin nhắn từ 7 học viên — trích nguyên văn, đã ẩn danh")
    t.hang_the([
        ("M0003", "trang 9", "“TẠO QUIZ ĐỂ TÔI HIỂU RÕ VÀ ÔN LẠI TOÀN BỘ SLIDE NÀY”", NGOC),
        ("M0217", "trang 47", "“dựa vào tài liệu này bạn hãy cho tôi bộ quizz liên quan”", LAM),
        ("M0872", "trang 3", "“tóm tắt những ý chính, chi tiết để tôi có thể làm quiz kahoot cuối giờ”", TIM),
    ])
    t.nhac("Cách đếm — chạy lại được, không phải nhận xét cảm tính",
           "python eval/mine_evidence.py  —  script in ra từng con số kèm quy tắc đếm "
           "ngay dưới mỗi dòng: đếm trên cột nào, lọc role gì, parse JSON ra sao. "
           "Người chấm chạy lệnh này không ra đúng số trong spec thì spec sai.")

    # ---------------------------------------------------------------- 3. Lát cắt
    t = Trang(doc, 3, 6)
    t.dau_trang(
        "Lát cắt",
        "AI quyết định: trang này có đủ căn cứ để ra đề hay không",
        "Không đủ căn cứ thì phải nói ra — không có đường nào để bịa",
        "Hợp đồng JSON trong codebase/quiz_ai.py buộc model chọn đúng một trong bốn "
        "hành động. Đây là ràng buộc ở tầng hợp đồng, không phải lời dặn trong prompt.")
    t.hang_the([
        ("ra_de", None, "Đủ căn cứ. Sinh câu hỏi kèm đoạn trích NGUYÊN VĂN từ slide "
                        "để học viên tự đối chiếu.", XANH),
        ("thieu_can_cu", None, "Trang không chứa thứ được hỏi. Nói thẳng là slide "
                               "không đề cập, đề nghị trang khác.", CAM),
        ("hoi_lai", None, "Yêu cầu mơ hồ hoặc cụt. Hỏi lại cho rõ thay vì đoán bừa.", VANG),
        ("tu_choi", None, "Đòi đáp án bài lab, đòi lộ đáp án trước, hoặc tấn công "
                          "prompt. Từ chối và đề nghị cách khác.", TIM),
    ])
    t.nhac("Vì sao chọn lát cắt này để đo",
           "Kết quả nhị phân: AI ra đề đúng căn cứ, hay không. Đúng/sai rõ ràng nên "
           "dựng được golden set và có số để nói — khác với “tóm tắt hay không hay”.")

    # ------------------------------------------------------------------ 4. Demo
    t = Trang(doc, 4, 6)
    t.dau_trang(
        "Demo",
        "Bốn thứ sẽ bấm trực tiếp, không quay sẵn",
        "Slide thật của khoá · AI thật qua NVIDIA NIM · deepseek-v4-pro")
    t.hang_the([
        ("Đọc slide thật", "01", "58 trang trích từ data pack. Dưới mỗi trang hiện "
         "ĐÚNG phần chữ mà AI đọc — sai thì thấy ngay do đâu.", XANH),
        ("Bôi đen hỏi Tutor", "02", "Chọn một đoạn, hỏi riêng đoạn đó. Gửi kèm cả "
         "trang để câu trả lời không trôi khỏi mạch bài.", LAM),
    ], cot=2)
    t.hang_the([
        ("Giảng cả file", "03", "Gửi toàn văn 29 trang, AI giảng theo mạch bài và "
         "ghi [Trang N] cho từng ý. Đo thực tế 160–168 giây.", VANG),
        ("Đấu quiz 1v1", "04", "Ghép với người đang đọc cùng trang, cùng lúc. Không "
         "có ai thì ghép bot — và màn hình ghi rõ là bot.", TIM),
    ], cot=2)
    t.nhac("Mất mạng vẫn demo được",
           "TUTOR_MODE=mock cho kết quả tất định, không gọi API. Mọi câu trả lời mock "
           "đều có tiền tố [MOCK] để không bao giờ nhầm là AI thật nói.")

    # -------------------------------------------------------------------- 5. Đo
    t = Trang(doc, 5, 6)
    t.dau_trang(
        "Đo",
        "Con số tổng có dao động — thứ không được phép sai thì chưa sai lần nào",
        "Golden set 23 câu · 14 câu lấy nguyên văn từ chatlog thật · bar chốt TRƯỚC khi đo")
    t.so_lieu([
        ("13 / 23", "lượt 1 · 30/07 22:07", "56,5% — dưới bar. Giữ nguyên số, không "
         "hạ bar xuống cho vừa.", CAM),
        ("18 / 23", "lượt 2 · 30/07 22:32", "78,3% — vượt bar. Không nâng bar lên "
         "sau khi thấy kết quả tốt.", XANH),
        ("17 / 23", "lượt 3 · 31/07 13:59", "73,9% — đo lại sau khi sửa code. Báo "
         "đúng số mới, kể cả khi thấp hơn lượt 2.", VANG),
    ])
    t.nhac("Chuẩn đạt: ≥65% VÀ không được bịa dù chỉ một lần → 0 / 0 / 0 qua cả ba lượt",
           "Vế thứ hai mới là vế quan trọng: đề kèm số trang trông rất có căn cứ, học "
           "viên không có cách nào tự phát hiện là sai. Từ lượt 2 trở đi không còn "
           "case nào AI suy luận sai — phần chưa đạt là thước đo đặt sai hoặc hạ tầng đứt.")

    # --------------------------------------------------------------- 6. Chưa xong
    t = Trang(doc, 6, 6)
    t.dau_trang(
        "Chưa xong",
        "Ba thứ nhóm biết mình còn thiếu",
        "Nói ra trước khi bị hỏi — biết mình sai ở đâu cũng là một phần của bài")
    t.hang_the([
        ("Chưa có người thật thử", "01", "validation/ còn trống. Cần ≥5 người ngoài "
         "nhóm dùng thật, quote nguyên văn.", CAM),
        ("Bug max_tokens", "02", "900 token không đủ cho bộ 5 câu tiếng Việt — JSON "
         "đứt giữa chuỗi. Đã truy ra, chưa sửa.", VANG),
        ("Khảo sát 0/20", "03", "Bộ câu hỏi soạn xong nhưng chưa gửi ai. Bằng chứng "
         "hiện chỉ có đường B.", TIM),
    ])
    t.nhac("Bốn câu fail còn lại là lỗi thước đo, và nhóm cố ý không sửa",
           "G03–G06 kỳ vọng ra_de nhưng trỏ vào trang không có nội dung trong tài liệu "
           "mô phỏng — thieu_can_cu mới là hành vi đúng. Sửa kỳ vọng rồi chạy lại sẽ "
           "lên khoảng 20/23, nhưng đó là nâng điểm bằng cách chỉnh thước đo sau khi "
           "đã nhìn thấy kết quả. Số nộp giữ nguyên.")


def main() -> int:
    doc = fitz.open()
    dung(doc)
    # Segoe UI regular + bold nhúng nguyên là ~1,1 MB. Chỉ giữ lại đúng những
    # ký tự thật sự dùng trên 6 trang -> file nhẹ đi nhiều lần, chữ vẫn là chữ
    # vector tìm kiếm được.
    try:
        doc.subset_fonts()
    except Exception as e:
        print(f"  [bo qua] khong rut gon duoc font: {e}")
    doc.save(RA, deflate=True, garbage=4)
    doc.close()
    kb = RA.stat().st_size // 1024
    print(f"Đã ghi {RA.relative_to(ROOT)} — {kb} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
