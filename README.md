# Kiểm tra hiểu ngay trên slide — VLearn

**Khoá 4 · Zone `[__]` · Nhóm `[__]`** · Mini Hackathon AI Batch 03
Hướng **A — VLearn**, loại **tối ưu tính năng có sẵn**.

> Đề bài gốc của ban tổ chức giữ nguyên tại [`00-README-de-bai-goc.md`](00-README-de-bai-goc.md).

---

## Bài toán

AI Tutor của VLearn giải thích xong nhưng **gần như không bao giờ kiểm tra học viên
có hiểu không**. Đo trên 1.261 lượt hỏi-đáp thật của 369 học viên:

- `asked_check_question = True`: **3 / 2.522** (0,12%)
- `move_used = validate_understanding`: **1 / 1.261** (0,08%)
- `misconceptions` (phát hiện hiểu lầm): **0 / 1.261** — field có trong thiết kế, chưa từng dùng

Trong khi đó học viên **tự đi xin** thứ đó: `M0003` gõ *"TẠO QUIZ ĐỂ TÔI HIỂU RÕ VÀ
ÔN LẠI TOÀN BỘ SLIDE NÀY"*, `M0217`, `M0872` cũng vậy — trong một sản phẩm không có
tính năng ra đề.

Chạy `python eval/mine_evidence.py` để tái tạo mọi con số trên.

## Lát cắt

> Học viên vừa đọc xong một slide · muốn biết mình đã hiểu thật chưa ·
> **AI quyết định slide này có đủ căn cứ để ra đề không, rồi sinh câu hỏi kiểm tra
> hiểu và chấm câu trả lời** · trả về đúng/sai kèm đoạn trích nguyên văn từ slide.

Model: `deepseek-ai/deepseek-v4-pro` qua NVIDIA NIM.

## Chạy thử

```bash
cd codebase
python server.py
```

Mở http://localhost:8000. Mặc định `TUTOR_MODE=mock` (chạy được khi mất mạng).
Muốn gọi model thật: đặt `TUTOR_MODE=nim` và điền `OPENAI_API_KEY` vào `.env`
ở thư mục cha. **Không commit API key.**

Chạy bộ đo:

```bash
python eval/run_eval.py
```

## Kết quả đo

| Lượt | Kết quả | Quality bar ≥65% | Số lần bịa (bar cứng: 0) |
|---|---|---|---|
| 1 | 13/23 = 56,5% | ❌ | **0** ✅ |
| 2 | **18/23 = 78,3%** | ✅ | **0** ✅ |

Bảng đủ mọi case kể cả case fail: [`eval/ket-qua-lan-1.md`](eval/ket-qua-lan-1.md) ·
[`eval/ket-qua-lan-2.md`](eval/ket-qua-lan-2.md).

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| [`spec.md`](spec.md) | AI Spec §1–§9 — deliverable trung tâm |
| `codebase/quiz_ai.py` | **Quyết định AI trung tâm** — ra đề / báo thiếu căn cứ / hỏi lại / từ chối |
| `codebase/server.py` | Server tĩnh + `/api/tutor` + `/api/quiz/*` |
| `codebase/app.js` | Giao diện reader + quiz |
| `codebase/slides.json` | Nội dung slide (phần mock, xem spec §4) |
| `eval/golden-set.jsonl` | 23 case, phủ 4 lớp chỗ khó, 14 case lấy từ chatlog thật |
| `eval/run_eval.py` | Chạy trọn bộ, in bảng đủ mọi case |
| `eval/mine_evidence.py` | Tái tạo số liệu bằng chứng trong spec §1 |
| `validation/` | Feedback log vòng user test |
| `reflection/` | Mỗi thành viên một file |

## Thành viên & phân công

| Họ tên | Mã HV | Phụ trách | File phải giải thích được ở CP5 |
|---|---|---|---|
| **Nguyễn Trung Đức** *(nhóm trưởng)* | `[__]` | Demo, validation, điều phối | `validation/feedback-log.md`, slide demo |
| Trần Thế Ninh | `[__]` | Spec, evidence mining, prompt, golden set, backend, eval | `spec.md`, `codebase/quiz_ai.py`, `codebase/server.py`, `eval/` |
| Trịnh Quang Anh | `[__]` | Giao diện reader + luồng quiz | `codebase/app.js`, `codebase/styles.css` |
| Nguyễn Thị Thu Trang | `[__]` | Giao diện Dashboard / Khóa học / Sổ tay | `codebase/index_v2.html` |

> ⚠️ **Còn thiếu mã HV của cả 4 người.** Mã HV của nhóm trưởng là mã định danh nhóm
> xuyên suốt các checkpoint — điền trước checkpoint kế tiếp.
> ⚠️ Phân công ghi theo phần việc thấy trong repo, **cả nhóm cần xác nhận lại**.

## Dữ liệu

Data pack trong `data/` là dữ liệu thật của khoá đã ẩn danh, cấp riêng cho hackathon.
Chỉ dùng trong phạm vi sự kiện, không chia sẻ ra ngoài khoá, không suy ngược danh tính.
Trích dẫn trong repo dùng **mã message** (`M0003`) thay vì dán nguyên văn dài.
