#!/usr/bin/env python3
"""Server tinh cho VLearn Reader va endpoint tutor noi bo."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import time
from urllib import request, error

ROOT = Path(__file__).resolve().parent
PARENT_ENV = ROOT.parent / ".env"
PORT = int(os.environ.get("PORT", "8000"))
TUTOR_MODE = os.environ.get("TUTOR_MODE", "mock").strip().lower() or "mock"


def load_env_file():
    """Nap bien moi truong tu .env o thu muc cha neu bien chua ton tai."""
    if not PARENT_ENV.exists():
        return
    for raw in PARENT_ENV.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def friendly_error(message):
    return {"reply": "Tutor đang chạy nhưng chưa gọi được model thật: " + message}


def latest_user_content(messages):
    for msg in reversed(messages):
        if msg.get("role") == "user":
            return str(msg.get("content", ""))
    return ""


def mock_reply(messages):
    time.sleep(0.4)
    content = latest_user_content(messages)
    slide = content
    question = ""
    marker = "\n\nCâu hỏi của sinh viên: "
    if marker in content:
        slide, question = content.split(marker, 1)
    prefix = "Nội dung slide"
    if prefix in slide:
        slide = slide.split("): ", 1)[-1]
    slide = " ".join(slide.split())
    question = " ".join(question.split())
    if len(slide) > 360:
        slide = slide[:357].rstrip() + "..."
    if not question:
        question = "câu hỏi hiện tại"
    return {
        "reply": "[MOCK] Dựa trên slide: " + slide + "\n\nTrả lời ngắn: với " + question + ", hãy đối chiếu kỳ vọng của người dùng với năng lực thật của AI, rồi kiểm tra bằng explainability và quyền kiểm soát của người dùng."
    }


def nim_reply(payload):
    load_env_file()
    base_url = os.environ.get("OPENAI_BASE_URL", "").rstrip("/")
    api_key = os.environ.get("OPENAI_API_KEY", "")
    model = os.environ.get("MODEL_SMART", "")
    if not base_url:
        return friendly_error("thiếu OPENAI_BASE_URL.")
    if not api_key:
        return friendly_error("thiếu OPENAI_API_KEY.")
    if not model:
        return friendly_error("thiếu MODEL_SMART.")

    messages = [{"role": "system", "content": payload.get("system", "")}]
    messages.extend(payload.get("messages", []))
    body = {
        "model": model,
        "messages": messages,
        "max_tokens": int(payload.get("max_tokens", 700)),
    }
    req = request.Request(
        base_url + "/chat/completions",
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + api_key,
        },
        method="POST",
    )
    try:
        with request.urlopen(req, timeout=60) as res:
            data = json.loads(res.read().decode("utf-8"))
        reply = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        return {"reply": reply or "Tutor chưa nhận được nội dung trả lời từ model."}
    except error.HTTPError as exc:
        return friendly_error("HTTP " + str(exc.code) + " từ dịch vụ model.")
    except Exception as exc:
        return friendly_error(str(exc))


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".html": "text/html; charset=utf-8",
        ".css": "text/css; charset=utf-8",
        ".js": "text/javascript; charset=utf-8",
        ".json": "application/json; charset=utf-8",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def log_message(self, format, *args):
        return

    def do_POST(self):
        if self.path != "/api/tutor":
            self.send_json({"reply": "Endpoint không tồn tại."}, status=404)
            return
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self.send_json({"reply": "Dữ liệu gửi lên không hợp lệ."})
            return

        if TUTOR_MODE == "nim":
            data = nim_reply(payload)
        else:
            data = mock_reply(payload.get("messages", []))
        self.send_json(data)

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"VLearn Reader: http://localhost:{PORT} TUTOR_MODE={TUTOR_MODE}", flush=True)
    server.serve_forever()
