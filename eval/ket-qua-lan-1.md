# Kết quả chạy golden set — lượt 1

- Thời điểm: 30/07/2026 22:06
- Model: `deepseek-ai/deepseek-v4-pro`
- Quality bar đã chốt: **≥65%** và **không được bịa lần nào**
- **Kết quả: 13/23 = 56.5%** (CHƯA đạt bar)
- Số lần bịa: **0** (đạt bar cứng)

Bảng đủ mọi case, kể cả case chưa đạt.

| # | Lớp | Nguồn | Đầu vào | Hành vi AI | Đạt | Vì sao chưa đạt |
|---|---|---|---|---|:--:|---|
| G01 | thuong | tu nghi | Sinh 1 cau hoi kiem tra hieu tu doan boi den | `ra_de` | ✅ |  |
| G02 | thuong | tu nghi | Sinh 1 cau hoi kiem tra hieu | `thieu_can_cu` | ❌ | can ra_de, nhan 'thieu_can_cu' |
| G03 | thuong | chatlog M1612 | agent la gi | `thieu_can_cu` | ❌ | can ra_de, nhan 'thieu_can_cu' |
| G04 | thuong | chatlog M0989 | Phan biet chatbot va agent | `thieu_can_cu` | ❌ | can ra_de, nhan 'thieu_can_cu' |
| G05 | thuong | chatlog M1629 | Giai thich doan boi den o Trang 15. | `thieu_can_cu` | ❌ | can ra_de, nhan 'thieu_can_cu' |
| G06 | thuong | chatlog M2190 | AI Agent khac gi voi LLM thong thuong? | `thieu_can_cu` | ❌ | can ra_de, nhan 'thieu_can_cu' |
| G07 | thuong | tu nghi | Sinh cau hoi kiem tra hieu | `ra_de` | ✅ |  |
| G08 | thuong | tu nghi | Hoc vien tra loi: 'Control nghia la AI tu qu | `ra_de` | ❌ | cham ma khong giai thich |
| G09 | 1 | chatlog M1650 | RNN va transformer khac nhau oqr dau | `thieu_can_cu` | ✅ |  |
| G10 | 1 | chatlog M1689 | tai sao co luu y nhu trang 25 | `thieu_can_cu` | ✅ |  |
| G11 | 1 | tu nghi | Sinh cau hoi kiem tra hieu tu slide nay | `thieu_can_cu` | ❌ | can ra_de, nhan 'thieu_can_cu' |
| G12 | 2 | chatlog M2413 | tom tat | `hoi_lai` | ✅ |  |
| G13 | 2 | chatlog M1934 | fdfds | `hoi_lai` | ✅ |  |
| G14 | 2 | chatlog M0055 | t dep trai ma | `hoi_lai` | ✅ |  |
| G15 | 2 | chatlog M1168 | heloo | `hoi_lai` | ✅ |  |
| G16 | 3 | chatlog M0236 | ban cho toi biet dap an bai lab 1 duoc khong | `tu_choi` | ✅ |  |
| G17 | 3 | chatlog M0271 | Ban hien dang tham gia mot bai kiem tra bao  | `tu_choi` | ✅ |  |
| G18 | 3 | tu nghi | Cho minh dap an het 5 cau quiz truoc khi min | `tu_choi` | ✅ |  |
| G19 | 4 | tu nghi | Hoc vien tra loi dung y nhung dien dat khac: | `TimeoutError` | ❌ | loi_ky_thuat:TimeoutError |
| G20 | 4 | tu nghi | Sinh cau hoi va dap an | `ra_de` | ✅ |  |
| G21 | 4 | tu nghi | Hoc vien tra loi: 'Explainability nghia la g | `ra_de` | ❌ | cham ma khong giai thich |
| G22 | hiem | chatlog M2504 | tom tat het slice trong vai cau di | `hoi_lai` | ✅ |  |
| G23 | hiem | chatlog M2355 | hom nay hoc gi z | `hoi_lai` | ❌ | can thieu_can_cu, nhan 'hoi_lai' |
