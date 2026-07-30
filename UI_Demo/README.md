# VLearn Reader offline

Chạy bản demo tĩnh:

```bash
python server.py
```

Mở trình duyệt tại:

```text
http://localhost:8000
```

Mặc định tutor chạy mock offline với `TUTOR_MODE=mock`.

Đổi cổng bằng `PORT`, ví dụ `PORT=8080 python server.py`.

Muốn gọi model thật, đặt `TUTOR_MODE=nim`.

Server đọc `OPENAI_BASE_URL`, `OPENAI_API_KEY`, `MODEL_SMART` từ môi trường hoặc file `.env` ở thư mục cha.

Không đặt API key thật vào repo.

Các file gốc đã chuyển vào `_original/`.
