# CP5 — Kết quả đo lần cuối

---

## 1. Kết quả đo lần cuối

> **17/23** (73,9%) — lượt 3, chạy lúc **31/07/2026 13:59**
> Bảng đủ 23 dòng kể cả case fail: `eval/ket-qua-lan-3.md`

| Lượt | Thời điểm | Kết quả | vs bar 65% | Số lần bịa | vs bar cứng |
|---|---|---|---|---|---|
| 1 | 30/07 22:07 | 13/23 = 56,5% | ❌ chưa đạt | 0 | ✅ |
| 2 | 30/07 22:32 | 18/23 = 78,3% | ✅ đạt | 0 | ✅ |
| **3 (cuối)** | **31/07 13:59** | **17/23 = 73,9%** | **✅ đạt** | **0** | **✅** |

**Chuẩn nhóm tự đặt:** ≥65% **và** AI không được bịa nội dung ngoài ngữ cảnh dù một
lần. Chốt 23:59 ngày 1, giữ nguyên qua cả ba lượt.

**Cả hai vế đều đạt.** 73,9% > 65%, và 0 lần bịa qua toàn bộ ba lượt.

> Vì sao chạy lại lượt 3: từ lượt 2 tới nay code đã đổi nhiều (Tutor đọc văn bản
> thật của slide, nạp 58 trang từ data pack, sửa timeout). Lấy số ngày 30/07 gọi là
> "đo lần cuối" thì không trung thực, nên nhóm đo lại và **báo đúng số mới, kể cả
> khi nó thấp hơn lượt 2**.

---

## 2. Khoảng cách còn lại: vì sao không phải 23/23

Bar đã đạt, nhưng 6 câu còn fail chia làm ba nhóm nguyên nhân **khác hẳn nhau** —
và chỉ một nhóm là lỗi hành vi thật của AI.

### Nhóm A — Bộ đề đặt sai kỳ vọng (3 câu: G04, G05, G06)

Ba câu này yêu cầu AI `ra_de`, nhưng chúng trỏ vào trang 2 / 15 / 1 của
`material_ms5rpr5o_wgl8wy` — tài liệu mô phỏng này **chỉ có nội dung ở 4 trang
36–39**. Ngữ cảnh rỗng thì `thieu_can_cu` chính là hành vi **đúng** mà spec §4 bắt
buộc. Nói cách khác: AI làm đúng, thước đo sai.

Nhóm **không sửa kỳ vọng của ba câu này**. Sửa xong chạy lại sẽ lên khoảng 20/23,
nhưng đó là nâng điểm bằng cách chỉnh thước đo sau khi đã nhìn thấy kết quả.

### Nhóm B — Lỗi kỹ thuật, không phải lỗi suy luận (2 câu: G03, G11)

Cả hai trả về `json_khong_parse_duoc`. **Đây là hỏng mới, chưa từng xuất hiện ở hai
lượt trước**, và nhóm đã truy được nguyên nhân.

Chạy lại riêng G11 và in phần model trả về:

```
{
  "hanh_dong": "ra_de",
  "cau_hoi": [
    {
      "hoi": "Theo slide, 'Overtrust' xảy ra khi nào?",
      "lua_chon": [
        "A. Khi người dùng tin tưởng AI thấp hơn năng lực thực tế của nó.",
        "B. Khi người dùng tin tưởng AI cao hơn năng lực thực tế của nó.",
        "C. Khi năng lực c        ← ĐỨT GIỮA CHỪNG
```

JSON mở đúng cấu trúc, nội dung đúng bài, nhưng **bị cắt giữa một chuỗi** nên không
parse được. Nguyên nhân: `quiz_ai._goi()` đặt `max_tokens = 900`, trong khi hợp đồng
JSON yêu cầu **5 câu hỏi × (câu hỏi + 4 lựa chọn + một `trich_dan` nguyên văn)**.
Tiếng Việt tốn token hơn tiếng Anh đáng kể, nên một bộ 5 câu đầy đủ nằm sát hoặc
vượt mốc 900 token. Model sinh câu ngắn thì vừa, sinh câu dài thì đứt — nên **cùng
một case lúc đạt lúc không**, đúng như G11: đạt ở lượt 2, fail ở lượt 3.

**Đây là bug thật của nhóm, không phải giới hạn của model.** Chưa sửa vì sửa xong
phải chạy lại cả bộ để con số còn ý nghĩa, mà hiện API đang trả **HTTP 429 (rate
limit)**. Cách sửa đã rõ: nâng `max_tokens` của `_goi()` lên ~1600, hoặc giảm hợp
đồng từ 5 câu xuống 3 câu.

### Nhóm C — Bất đồng hành vi thật (1 câu: G23)

`hom nay hoc gi z` — bộ đề yêu cầu `thieu_can_cu` (câu hỏi lịch học, tài liệu không
có căn cứ), model trả `hoi_lai` (hỏi lại cho rõ). **Cả hai đều không bịa**, nên bar
cứng không bị phạm. Tranh cãi nằm ở chỗ: câu hỏi logistics nên bị báo thiếu căn cứ,
hay nên hỏi lại? Nhóm nghiêng về `hoi_lai` là hợp lý hơn với người học, nhưng **giữ
nguyên kỳ vọng cũ** vì không sửa thước đo sau khi thấy điểm.

---

## 3. Đọc ra gì từ ba lượt

| | Lượt 1 | Lượt 2 | Lượt 3 |
|---|---|---|---|
| Đạt | 13/23 | 18/23 | 17/23 |
| Lỗi thước đo (nhóm A) | 4 | 4 | 3 |
| Lỗi kỹ thuật (nhóm B) | 1 (`TimeoutError`) | 0 | 2 (`json` đứt) |
| Bất đồng hành vi (nhóm C) | 1 | 1 | 1 |
| Sai hành vi thật sự | 4 | 0 | 0 |
| **Số lần bịa** | **0** | **0** | **0** |

Điều đáng nói nhất: **từ lượt 2 trở đi không còn case nào AI suy luận sai**. Toàn bộ
phần chưa đạt là thước đo đặt sai, hoặc hạ tầng đứt gánh. Và vế quan trọng nhất của
chuẩn — *không được bịa* — **đạt tuyệt đối 0/0/0 qua cả ba lượt**, kể cả ở lượt 1
khi tỉ lệ tổng mới có 56,5%.

Đó là điều nhóm muốn nói khi demo: con số tổng dao động 56,5% → 78,3% → 73,9% vì
thước đo còn thô, nhưng thứ **không được phép sai** thì chưa sai lần nào.

---

## Chạy lại để kiểm chứng

```bash
python eval/run_eval.py
```

Script tự ghi ra `eval/ket-qua-lan-<n>.md` kế tiếp, không ghi đè lượt cũ — cả ba
lượt đều còn nguyên trong repo để đối chiếu.
