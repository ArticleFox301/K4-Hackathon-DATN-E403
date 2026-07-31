#!/usr/bin/env python3
"""Server tinh cho VLearn Reader, endpoint tutor noi bo va Quiz Battle matchmaking."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import random
import threading
import time

ROOT = Path(__file__).resolve().parent
PARENT_ENV = ROOT.parent / ".env"

# quiz_ai nap .env ngay khi import (no tu di nguoc len cay thu muc de tim),
# nen phai import TRUOC khi doc TUTOR_MODE.
try:
    import quiz_ai
except Exception as _e:  # thieu file/thu vien -> van chay duoc o che do mock
    quiz_ai = None
    print(f"[canh bao] khong import duoc quiz_ai: {_e} -> chay che do mock", flush=True)

PORT = int(os.environ.get("PORT", "8000"))
TUTOR_MODE = os.environ.get("TUTOR_MODE", "mock").strip().lower() or "mock"

# ------------------------------------------------- "server có đang chạy bản mới nhất không?"
# Python nạp server.py/quiz_ai.py vào bộ nhớ MỘT lần lúc khởi động. Sửa file
# xong mà quên khởi động lại thì tiến trình vẫn chạy mã cũ, không có dấu hiệu
# nào báo — sửa đúng mà hành vi vẫn sai, mất rất nhiều thời gian mò.
# Chụp mã băm lúc khởi động, rồi /api/health so lại với mã băm trên đĩa.
FILE_PY = ["server.py", "quiz_ai.py"]


def _bam(ten: str) -> str:
    try:
        import hashlib
        return hashlib.sha256((ROOT / ten).read_bytes()).hexdigest()[:10]
    except Exception:
        return "?"


BAM_LUC_KHOI_DONG = {t: _bam(t) for t in FILE_PY}

# ---------------------------------------------------------------- trạng thái
# Toàn bộ trạng thái ghép trận nằm trong RAM và ĐƯỢC KHOÁ bằng STATE_LOCK.
# ThreadingHTTPServer phục vụ mỗi request trên một luồng riêng: hai người cùng
# bấm "Ghép trận" ở cùng mili-giây sẽ chạy song song. Không khoá thì cả hai đều
# thấy hàng đợi rỗng rồi cùng đứng đợi — lỗi kinh điển của matchmaking.
STATE_LOCK = threading.RLock()

PRESENCE = {}       # userId -> { userId, userName, materialId, page, lastSeen, trangThai }
QUEUE = {}          # "materialId|page" -> [ ve ] (vé xếp hàng, cũ đứng trước)
ACTIVE_ROOMS = {}   # roomId -> room
USER_ROOM = {}      # userId -> roomId (để client tra vé của mình)

PRESENCE_TTL = 30.0     # quá bằng này giây không heartbeat -> coi như đã rời
QUEUE_TTL = 12.0        # vé không được làm mới trong bằng này giây -> huỷ
BOT_SAU = 10.0          # đợi người thật bằng này giây, không có thì ghép bot
GIAY_MOI_CAU = 20.0     # thời gian trả lời mỗi câu
GIAY_LO_DAP_AN = 6.0    # thời gian xem đáp án trước khi sang câu kế
GIAY_DEM_NGUOC = 3.0    # đếm ngược sau khi ghép xong
SO_CAU = 5

BOT_NAMES = [
    "AI Học Viên (Minh Trí)",
    "VLearn Tutor Bot",
    "AI Student (Khánh Linh)",
    "Học Viên AI (Đức Anh)",
]

SLIDE_QUIZZES = {
    "37": [
        {
            "question": "Trong thiết kế AI, Trust Calibration là sự cân bằng giữa hai yếu tố nào?",
            "options": [
                "Lòng tin của người dùng (Trust) & Năng lực thực tế của AI (Capability)",
                "Chi phí vận hành server & Tốc độ phản hồi của API",
                "Số lượng tính năng giao diện & Dung lượng bộ nhớ",
                "Độ chính xác mô hình & Số lượng bài viết truyền thông"
            ],
            "correct": 0,
            "explanation": "Trust calibration đạt trạng thái tối ưu khi lòng tin của người dùng khớp hoàn toàn với năng lực thực sự của hệ thống AI."
        },
        {
            "question": "Hiện tượng Overtrust (Lòng tin thái quá) xảy ra khi nào?",
            "options": [
                "Khi lòng tin người dùng vượt quá năng lực thực tế của AI",
                "Khi người dùng hoàn toàn không tin tưởng vào kết quả AI",
                "Khi hệ thống AI chạy quá nhanh vượt mong đợi",
                "Khi giao diện AI không hiển thị nút phản hồi"
            ],
            "correct": 0,
            "explanation": "Overtrust nguy hiểm vì người dùng tin tưởng tuyệt đối vào AI, dẫn tới lạm dụng và bỏ qua việc kiểm tra lại thông tin."
        },
        {
            "question": "Ba trụ cột chính để kiến tạo Trust Calibration gồm những gì?",
            "options": [
                "Expectation (Kỳ vọng) + Explainability (Giải thích) + Control (Kiểm soát)",
                "Accuracy (Chính xác) + Speed (Tốc độ) + Low Cost (Giá rẻ)",
                "Prompt (Nội dung) + Model (Mô hình) + Output (Kết quả)",
                "Interface (Giao diện) + Data (Dữ liệu) + Security (Bảo mật)"
            ],
            "correct": 0,
            "explanation": "Để hiệu chỉnh lòng tin đúng mức, UI/UX cần thiết lập kỳ vọng đúng, minh bạch cách AI hoạt động và trao quyền kiểm soát cho người dùng."
        },
        {
            "question": "Hậu quả chính của trạng thái Distrust (Thiếu tin tưởng) là gì?",
            "options": [
                "Underuse: Người dùng bỏ qua và không tận dụng hết giá trị thực sự của AI",
                "Overuse: Người dùng giao quá nhiều việc nguy hiểm cho AI",
                "Server AI bị quá tải truy cập",
                "Mô hình AI bị giảm độ chính xác"
            ],
            "correct": 0,
            "explanation": "Distrust khiến người dùng hoài nghi, từ chối sử dụng ngay cả khi AI có khả năng giải quyết công việc hiệu quả."
        },
        {
            "question": "Yếu tố Explainability đóng vai trò gì trong việc minh bạch trải nghiệm AI?",
            "options": [
                "Giúp người dùng hiểu cơ sở AI đưa ra quyết định & kiểm chứng độ tin cậy",
                "Tự động sửa tất cả các lỗi lập trình trong ứng dụng",
                "Tăng tốc độ phản hồi của câu trả lời AI lên gấp đôi",
                "Thay thế hoàn toàn vai trò của giảng viên con người"
            ],
            "correct": 0,
            "explanation": "Explainability giúp người dùng nhìn thấy nguyên nhân/tín hiệu AI dựa vào, từ đó đưa ra quyết định có nên tin tưởng kết quả hay không."
        }
    ]
}

DEFAULT_QUIZ = [
    {
        "question": "Nguyên tắc thiết kế sản phẩm AI hướng người dùng (Human-Centric AI) chú trọng nhất điều gì?",
        "options": [
            "Đặt con người làm trung tâm, tối ưu sự hợp tác giữa Người & AI",
            "Tự động hoá 100% không cần con người can thiệp",
            "Tối ưu thuật toán phức tạp nhất có thể",
            "Giảm tối đa chi phí phần cứng"
        ],
        "correct": 0,
        "explanation": "Human-Centric AI tập trung gia tăng năng lực cho con người thay vì thay thế con người hoàn toàn."
    },
    {
        "question": "Để tránh hiện tượng AI 'bịa đặt' thông tin (Hallucination), giải pháp UI/UX nào là hiệu quả?",
        "options": [
            "Trích dẫn nguồn gốc (Citations) & Hiển thị độ tin cậy",
            "Ẩn hoàn toàn câu trả lời của AI nếu có lỗi",
            "Khóa không cho người dùng đặt câu hỏi mới",
            "Tăng kích thước phông chữ của giao diện"
        ],
        "correct": 0,
        "explanation": "Cung cấp nguồn trích dẫn giúp người dùng dễ dàng đối chiếu và kiểm chứng tính chính xác của thông tin."
    },
    {
        "question": "Khi AI trả lời chưa chính xác, thiết kế UI nên cho phép người dùng thực hiện hành động gì?",
        "options": [
            "Chỉnh sửa câu trả lời, phản hồi (Feedback) hoặc yêu cầu thử lại",
            "Tự động đóng ứng dụng ngay lập tức",
            "Trừ điểm tài khoản của người dùng",
            "Không cho phép người dùng thao tác tiếp"
        ],
        "correct": 0,
        "explanation": "Quyền kiểm soát (Control) cho phép người học can thiệp, cung cấp phản hồi để AI cải thiện."
    },
    {
        "question": "VLearn Tutor giúp người học giải quyết vấn đề gì khi đọc tài liệu?",
        "options": [
            "Giải thích đoạn trích theo đúng ngữ cảnh slide trang đang mở",
            "Tự động thi hộ học viên trong các kỳ thi",
            "Dịch toàn bộ cuốn sách sang 50 ngôn ngữ khác nhau",
            "Xóa các tài liệu không cần thiết"
        ],
        "correct": 0,
        "explanation": "VLearn Tutor được thiết kế bám sát ngữ cảnh tài liệu slide để hỗ trợ học viên hiểu sâu đúng trọng tâm."
    },
    {
        "question": "Trận đấu Quiz 1v1 trong VLearn áp dụng cơ chế tính điểm tốc độ như thế nào?",
        "options": [
            "Trả lời đúng càng nhanh thì điểm thưởng tốc độ càng cao",
            "Tính điểm cố định bất kể thời gian trả lời",
            "Trả lời muộn nhất sẽ được cộng thêm điểm",
            "Chỉ tính điểm khi cả 2 người cùng chọn đáp án giống nhau"
        ],
        "correct": 0,
        "explanation": "Cơ chế Kahoot chuẩn thưởng điểm theo thời gian phản hồi: Điểm = Điểm chuẩn + Bonus Tốc độ."
    }
]


def load_env_file():
    """Nap bien moi truong tu .env.

    quiz_ai.nap_env() da di nguoc len cay thu muc de tim .env — ham nay chi con
    la duong lui khi khong import duoc quiz_ai.
    """
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


def mock_reply(messages):
    """Tra loi tat dinh, khong goi mang. Dung khi mat mang hoac thieu API key.

    Moi cau tra loi co tien to [MOCK] de khong bao gio nham la AI that noi
    (spec §4: phan nao mock phai ghi ro)."""
    hoi = ""
    for m in reversed(messages or []):
        if m.get("role") == "user":
            hoi = str(m.get("content", ""))
            break
    hoi = hoi.strip().replace("\n", " ")
    if len(hoi) > 160:
        hoi = hoi[:160] + "..."
    return {"reply": (
        "[MOCK] Minh dang chay o che do khong goi mang nen chua tra loi thuc chat duoc.\n\n"
        f"Cau hoi nhan duoc: {hoi or '(trong)'}\n\n"
        "De bat model that: dat TUTOR_MODE=nim trong .env va chay lai server."
    )}


def nim_reply(payload):
    """Goi model that qua quiz_ai (OpenAI-compatible endpoint trong .env).

    Ham nay TUNG BI THIEU: server.py goi nim_reply/mock_reply nhung khong dinh
    nghia o dau -> moi tin nhan chat deu nem NameError va giao dien hien
    "AI hien khong the tra loi".
    """
    if quiz_ai is None or not quiz_ai.san_sang():
        return mock_reply(payload.get("messages", []))

    system = payload.get("system") or (
        "Ban la VLearn Tutor, tro ly hoc tap theo ngu canh cho khoa COMP2010. "
        "Tra loi ngan gon, ro rang bang tieng Viet, bam sat noi dung slide duoc cung cap. "
        "Neu cau hoi nam ngoai noi dung slide, noi ro la slide khong de cap thay vi doan."
    )
    msgs = payload.get("messages", []) or []
    # Gop lich su thanh mot luot user de dung lai duoc ham _goi san co.
    parts = []
    for m in msgs[-9:]:
        vai = "Hoc vien" if m.get("role") == "user" else "Tutor"
        parts.append(f"{vai}: {m.get('content', '')}")
    user = "\n\n".join(parts)

    max_tokens = int(payload.get("max_tokens", 700))

    # Thời gian chờ phải co giãn theo khối lượng, không được để cứng.
    #
    # Trước đây mọi lượt đều dùng mặc định 120 giây của goi_van_ban(). Hỏi một
    # trang thì thừa, nhưng "Giảng cả file" gửi ~17 nghìn ký tự và xin 1800
    # token đầu ra — đo thực tế vượt xa 120 giây, nên nút đó LUÔN trả
    # TimeoutError dù model vẫn đang chạy bình thường.
    cho = int(min(600, max(120, 60 + len(user) / 120 + max_tokens / 12)))

    kq = quiz_ai.goi_van_ban(system, user, max_tokens=max_tokens, timeout=cho)
    if kq.get("text"):
        return {"reply": kq["text"]}

    loi = kq.get("loi", "khong ro")
    if loi == "TimeoutError":
        return {"reply": (
            f"Model chưa trả lời xong trong {cho} giây nên mình phải dừng chờ.\n\n"
            f"Yêu cầu này nặng: {len(user):,} ký tự ngữ cảnh, xin tối đa {max_tokens} token trả về. "
            "Thử lại thường được vì lần sau model đã ấm; hoặc hỏi từng trang thay vì cả file."
        ).replace(",", ".")}
    if loi == "thieu_api_key":
        return {"reply": "Chưa có OPENAI_API_KEY trong .env nên mình chưa gọi được model thật."}
    return {"reply": f"[Lỗi kết nối model: {loi}] Vui lòng thử lại."}


# Cache bo cau hoi da sinh, theo (materialId, trang).
# Sinh 5 cau tu noi dung slide mat 12-25 giay -> lan dau bam nut trong nhu treo.
# Cache lam lan thu hai tro di gan nhu tuc thi, va PREWARM ham nong san cac trang
# co noi dung ngay luc khoi dong de demo khong phai cho.
QUIZ_CACHE = {}

# Một khoá riêng cho mỗi (materialId, trang) để GỘP các lượt soạn đề trùng nhau.
#
# Không có nó thì hai người cùng mở một trang và cùng bấm sẽ nổ ra HAI lượt gọi
# model cho đúng một bộ đề: tốn gấp đôi ngân sách API, và tệ hơn là hỏng ghép
# trận — người thứ nhất soạn xong trước, đứng đợi hết 10 giây rồi rơi vào đấu
# bot, trong khi người thứ hai vẫn đang chờ lượt gọi thừa của chính mình. Hai
# người ngồi cạnh nhau, cùng trang, cùng lúc, mà không bao giờ gặp được nhau.
#
# Gộp lại: người đến sau chờ đúng kết quả của người đến trước rồi dùng chung,
# nên cả hai vào hàng đợi cách nhau chưa tới một giây.
QUIZ_LOCKS = {}


def _khoa_de(khoa):
    with STATE_LOCK:
        return QUIZ_LOCKS.setdefault(khoa, threading.Lock())


def get_quiz_questions(page_str, doan_boi_den="", noi_dung_slide="", yeu_cau="",
                       material_id="", dung_cache=True):
    """Quyết định trung tâm: sinh câu hỏi kiểm tra hiểu từ nội dung slide.

    Gọi model thật (quiz_ai -> deepseek-ai/deepseek-v4-pro qua NVIDIA NIM).
    SLIDE_QUIZZES chỉ còn là lưới an toàn khi mất mạng hoặc thiếu key — mỗi câu
    dội về từ lưới này được đánh dấu `nguon="mock"` để không bao giờ nhầm là AI sinh.
    """
    khoa = (material_id, str(page_str))
    # Chi dung cache khi khong co doan boi den rieng — doan boi den khac nhau
    # thi de bai phai khac nhau, khong duoc tra ve bo cu.
    gop_duoc = dung_cache and not doan_boi_den
    if gop_duoc and khoa in QUIZ_CACHE:
        return json.loads(json.dumps(QUIZ_CACHE[khoa]))

    if gop_duoc:
        # Người đến sau xếp hàng ở đây thay vì gọi model lần nữa.
        with _khoa_de(khoa):
            # Kiểm tra lại cache sau khi giành được khoá: rất có thể người đến
            # trước vừa ghi xong trong lúc mình đang đợi.
            if khoa in QUIZ_CACHE:
                return json.loads(json.dumps(QUIZ_CACHE[khoa]))
            return _sinh_de(page_str, doan_boi_den, noi_dung_slide, yeu_cau,
                            material_id, khoa, ghi_cache=True)

    return _sinh_de(page_str, doan_boi_den, noi_dung_slide, yeu_cau,
                    material_id, khoa, ghi_cache=False)


def _sinh_de(page_str, doan_boi_den, noi_dung_slide, yeu_cau, material_id,
             khoa, ghi_cache):
    """Lượt sinh đề thật. Tách riêng để phần gộp ở trên đọc được thành một mạch."""
    if TUTOR_MODE == "nim" and quiz_ai is not None and quiz_ai.san_sang():
        kq = quiz_ai.sinh_cau_hoi(page_str, doan_boi_den, yeu_cau, noi_dung_slide)
        hd = kq.get("hanh_dong")
        if hd == "ra_de" and kq.get("cau_hoi"):
            out = []
            for c in kq["cau_hoi"][:5]:
                opts = c.get("lua_chon", [])
                if len(opts) != 4:
                    continue  # phong quiz gia dinh dung 4 lua chon
                out.append({
                    "question": c.get("hoi", ""),
                    "options": opts,
                    # PHAI la "correct": /api/quiz/submit va logic bot deu doc khoa
                    # nay. Dat nham thanh "answer" lam submit nem KeyError -> client
                    # treo mai o "Dang cho doi thu lua chon".
                    "correct": int(c.get("dap_an", 0)),
                    # trich dan nguyen van tu slide -> hien sau khi tra loi (HAX G2/G11)
                    "explanation": c.get("trich_dan", ""),
                    "trich_dan": c.get("trich_dan", ""),
                    "nguon": "ai",
                })
            if out:
                if ghi_cache:
                    QUIZ_CACHE[khoa] = json.loads(json.dumps(out))
                return out
        # Ba nhánh còn lại (thieu_can_cu / hoi_lai / tu_choi) KHÔNG ra đề —
        # đây chính là hành vi mà spec §5 và golden set đang kiểm.
        if hd in ("thieu_can_cu", "hoi_lai", "tu_choi"):
            return {"tu_choi": True, "hanh_dong": hd,
                    "thong_bao": kq.get("thong_bao", ""), "nguon": "ai"}

    fallback = json.loads(json.dumps(SLIDE_QUIZZES.get(str(page_str)) or DEFAULT_QUIZ))
    for c in fallback:
        c["nguon"] = "mock"
    return fallback


# ============================================================================
# CƠ CHẾ GHÉP TRẬN
# ============================================================================
# Câu hỏi phải trả lời được: "làm sao biết có người khác đang ở đúng slide này
# và cũng muốn đấu, đúng lúc này?" Trả lời bằng ba lớp, không lớp nào đoán:
#
#   1. PRESENCE  — client heartbeat 5 giây/lần kèm (materialId, page). Ai không
#      heartbeat trong 30 giây coi như đã rời. Đây là lớp "ai đang mở trang này".
#      Nó CHỈ dùng để hiển thị, không dùng để ghép: đang mở trang không có nghĩa
#      là muốn đấu.
#
#   2. QUEUE     — bấm "Ghép trận" mới sinh ra một *vé* nằm trong hàng đợi khoá
#      theo (materialId, page). Đây là lớp "ai đang muốn đấu, ngay bây giờ".
#      Vé phải được làm mới mỗi lượt poll; ngừng poll (đóng tab) thì vé hết hạn
#      sau 12 giây và biến mất khỏi hàng đợi. Ghép hai vé cùng ô -> một phòng.
#
#   3. ROOM      — phòng do server làm trọng tài. Server giữ đồng hồ, chấm điểm,
#      chuyển câu. Hai client chỉ poll và vẽ lại. Không client nào tự quyết được
#      thời gian hay điểm, nên không lệch trạng thái giữa hai máy.
#
# Đợi quá BOT_SAU giây không có người thật -> ghép bot, và phòng được đánh dấu
# matchType="bot" để giao diện nói thẳng là đang đấu với bot.
#
# Vì sao poll chứ không WebSocket: server này là http.server chuẩn thư viện, cả
# demo chạy offline được không cần cài gì. Chu kỳ poll 700ms cho 2 người/phòng
# là thừa mượt, và đổi sang WebSocket sau này chỉ phải thay lớp vận chuyển —
# toàn bộ luật chơi đã nằm ở server.


def _khoa_o(material_id, page) -> str:
    """Khoá ô ghép trận. Cùng tài liệu + cùng trang mới được ghép với nhau."""
    return f"{material_id}|{page}"


def _don_presence(now: float) -> None:
    for uid in [k for k, v in PRESENCE.items() if now - v["lastSeen"] > PRESENCE_TTL]:
        PRESENCE.pop(uid, None)


def _don_queue(now: float) -> None:
    for khoa in list(QUEUE.keys()):
        con = [v for v in QUEUE[khoa] if now - v["lastSeen"] <= QUEUE_TTL]
        if con:
            QUEUE[khoa] = con
        else:
            QUEUE.pop(khoa, None)


def _bo_khoi_queue(user_id: str, ve_id: str = "") -> None:
    """Bỏ vé của một người khỏi mọi hàng đợi.

    `ve_id` có giá trị thì CHỈ bỏ đúng vé đó. Cần vậy vì khi bấm "Đấu lại",
    client huỷ phiên cũ (gửi /api/quiz/leave qua sendBeacon) rồi xếp hàng lại
    ngay; lệnh leave đi bất đồng bộ nên có thể về sau và xoá nhầm cái vé mới
    vừa tạo — người chơi đứng đợi mãi không ai ghép.
    """
    for khoa in list(QUEUE.keys()):
        QUEUE[khoa] = [
            v for v in QUEUE[khoa]
            if v["userId"] != user_id or (ve_id and v.get("veId") != ve_id)
        ]
        if not QUEUE[khoa]:
            QUEUE.pop(khoa, None)


def _nguoi_choi(user_id, user_name, is_bot=False) -> dict:
    return {"userId": user_id, "userName": user_name, "isBot": is_bot,
            "score": 0, "streak": 0, "dungLien": 0}


def _tao_phong(mat_id, page, questions, p1: dict, p2: dict, match_type: str) -> dict:
    now = time.time()
    room = {
        "id": f"room_{int(now * 1000)}_{random.randint(100, 999)}",
        "materialId": mat_id,
        "page": page,
        "p1": p1,
        "p2": p2,
        "questions": questions,
        "qIndex": 0,
        "phase": "COUNTDOWN",
        "phaseEndsAt": now + GIAY_DEM_NGUOC,
        "answers": {},
        "matchType": match_type,
        "soCau": min(SO_CAU, len(questions)),
        "createdAt": now,
        # Bot trả lời sau một khoảng ngẫu nhiên chứ không tức thì — trả lời tức
        # thì làm người chơi luôn thấy "đối thủ đã chọn" trước cả khi kịp đọc đề.
        "botAnswerAt": None,
    }
    ACTIVE_ROOMS[room["id"]] = room
    USER_ROOM[p1["userId"]] = room["id"]
    if not p2["isBot"]:
        USER_ROOM[p2["userId"]] = room["id"]
    return room


def _cham(room: dict, p_key: str, q: dict, selected: int, con_lai: float) -> dict:
    """Chấm một lượt trả lời. Điểm = nền + thưởng tốc độ + thưởng chuỗi đúng."""
    p = room[p_key]
    dung = (selected == q["correct"])
    diem = 0
    if dung:
        p["streak"] += 1
        p["dungLien"] = p["streak"]
        thuong_chuoi = min(p["streak"] * 100, 500)
        ty_le_toc = max(0.0, min(1.0, con_lai / GIAY_MOI_CAU))
        diem = int(500 + 500 * ty_le_toc) + thuong_chuoi
    else:
        p["streak"] = 0
    p["score"] += diem
    return {"selectedOption": selected, "timeRemainingSec": round(con_lai, 1),
            "isCorrect": dung, "points": diem}


def _tra_loi_cua(room: dict, q_idx: int) -> dict:
    return room["answers"].setdefault(str(q_idx), {})


def _bot_chon(q: dict) -> int:
    """Bot đúng 75% — đủ khó để người chơi phải nghiêm túc, không phải bất khả bại."""
    if random.random() < 0.75:
        return q["correct"]
    return random.choice([i for i in range(len(q["options"])) if i != q["correct"]])


def tick(room: dict) -> dict:
    """Đưa phòng tới đúng trạng thái ứng với thời điểm hiện tại.

    Server là trọng tài duy nhất: đồng hồ, hết giờ, điểm và việc sang câu đều
    quyết ở đây. Client chỉ vẽ lại. Hàm này gọi được nhiều lần liên tiếp mà
    không sai (idempotent theo mốc thời gian), nên poll dày cỡ nào cũng an toàn.
    Phải gọi trong STATE_LOCK.
    """
    now = time.time()
    phase = room["phase"]

    if phase == "COUNTDOWN":
        if now >= room["phaseEndsAt"]:
            room["phase"] = "QUESTION"
            room["qIndex"] = 0
            room["phaseEndsAt"] = now + GIAY_MOI_CAU
            room["botAnswerAt"] = now + random.uniform(3.5, GIAY_MOI_CAU - 4)
        return room

    if phase == "QUESTION":
        q_idx = room["qIndex"]
        q = room["questions"][q_idx]
        tl = _tra_loi_cua(room, q_idx)

        # Bot tới lượt trả lời.
        p_bot = room["p2"] if room["p2"]["isBot"] else None
        if p_bot and p_bot["userId"] not in tl and room["botAnswerAt"] and now >= room["botAnswerAt"]:
            con_lai = max(0.0, room["phaseEndsAt"] - now)
            tl[p_bot["userId"]] = _cham(room, "p2", q, _bot_chon(q), con_lai)

        het_gio = now >= room["phaseEndsAt"]
        du_nguoi = room["p1"]["userId"] in tl and room["p2"]["userId"] in tl

        if het_gio or du_nguoi:
            # Ai chưa kịp trả lời tính là bỏ lượt (-1), không phải đáp án sai
            # ngẫu nhiên — phân biệt được hai thứ này khi đọc lại lịch sử.
            for key in ("p1", "p2"):
                p = room[key]
                if p["userId"] not in tl:
                    tl[p["userId"]] = _cham(room, key, q, -1, 0.0)
            room["phase"] = "REVEAL"
            room["phaseEndsAt"] = now + GIAY_LO_DAP_AN
        return room

    if phase == "REVEAL":
        if now >= room["phaseEndsAt"]:
            if room["qIndex"] + 1 < room["soCau"]:
                room["qIndex"] += 1
                room["phase"] = "QUESTION"
                room["phaseEndsAt"] = now + GIAY_MOI_CAU
                room["botAnswerAt"] = now + random.uniform(3.5, GIAY_MOI_CAU - 4)
            else:
                room["phase"] = "FINISHED"
                room["phaseEndsAt"] = now
        return room

    return room


def _de_cho(mat_id, page):
    """Bộ đề của một trang. Gần như luôn trúng cache vì /api/quiz/prepare đã chạy
    trước; giữ đường sinh lại phòng khi cache bị dọn hoặc client gọi thẳng."""
    slide_text = quiz_ai.noi_dung_slide(mat_id, page) if quiz_ai else ""
    return get_quiz_questions(page, noi_dung_slide=slide_text,
                              yeu_cau="Kiem tra hieu slide nay",
                              material_id=mat_id)


def don_phong_cu(gio_song: float = 1800.0) -> None:
    """Xoá phòng quá cũ. Không có bước này thì ACTIVE_ROOMS phình mãi — chạy cả
    buổi demo thì chưa sao, chạy cả ngày hội thảo thì hết RAM."""
    now = time.time()
    with STATE_LOCK:
        cu = [rid for rid, r in ACTIVE_ROOMS.items() if now - r["createdAt"] > gio_song]
        for rid in cu:
            ACTIVE_ROOMS.pop(rid, None)
        for uid in [u for u, r in USER_ROOM.items() if r not in ACTIVE_ROOMS]:
            USER_ROOM.pop(uid, None)


def vong_don_dep() -> None:
    while True:
        time.sleep(120)
        try:
            now = time.time()
            with STATE_LOCK:
                _don_presence(now)
                _don_queue(now)
            don_phong_cu()
        except Exception:
            pass


def _goi_phong(room: dict) -> dict:
    """Bản phòng gửi cho client, kèm mốc thời gian server để client bù lệch giờ."""
    out = json.loads(json.dumps(room))
    out["serverNow"] = time.time()
    out["remainingSec"] = max(0.0, room["phaseEndsAt"] - out["serverNow"])
    return out


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

    def end_headers(self):
        """Cấm cache cho mã nguồn.

        Đây là server dev. Sửa app.js xong mà trình duyệt vẫn chạy module cũ
        trong cache là lỗi mất thời gian nhất khi demo: code đúng, hành vi sai,
        và không có dấu hiệu nào chỉ ra nguyên nhân. Ảnh slide thì vẫn cho cache
        vì chúng nặng và gần như không đổi.
        """
        if self.path.split("?")[0].endswith((".js", ".css", ".html", ".json")):
            self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def _query(self):
        from urllib.parse import parse_qs, urlparse
        return parse_qs(urlparse(self.path).query)

    def do_GET(self):
        # Tiến trình đang chạy có khớp mã trên đĩa không.
        if self.path.startswith("/api/health"):
            tren_dia = {t: _bam(t) for t in FILE_PY}
            cu = [t for t in FILE_PY if tren_dia[t] != BAM_LUC_KHOI_DONG[t]]
            self.send_json({
                "moiNhat": not cu,
                "fileDaSuaSauKhiChay": cu,
                "bamLucKhoiDong": BAM_LUC_KHOI_DONG,
                "bamTrenDia": tren_dia,
                "tutorMode": TUTOR_MODE,
                "modelSanSang": bool(quiz_ai and quiz_ai.san_sang()),
                "model": getattr(quiz_ai, "MODEL", "?") if quiz_ai else "?",
                "thongBao": ("Server đang chạy đúng mã trên đĩa." if not cu else
                             "Đã sửa " + ", ".join(cu) + " sau khi khởi động — "
                             "phải chạy lại server.py thì thay đổi mới có hiệu lực."),
            })
            return

        # Trạng thái phòng — client poll ~700ms/lần trong lúc đấu.
        if self.path.startswith("/api/quiz/room"):
            room_id = self._query().get("id", [""])[0]
            with STATE_LOCK:
                room = ACTIVE_ROOMS.get(room_id)
                if not room:
                    self.send_json({"error": "Phòng không tồn tại"}, status=404)
                    return
                tick(room)
                self.send_json(_goi_phong(room))
            return

        # Nội dung chữ của trang slide — Tutor cần cái này để trả lời bám slide
        # thật. Trước đây slide thật là ẢNH, client không có chữ nào để gửi kèm
        # nên Tutor trả lời chay theo trí nhớ model.
        if self.path.startswith("/api/slide-text"):
            q = self._query()
            mat_id = q.get("materialId", [""])[0]
            page = q.get("page", ["1"])[0]
            text = quiz_ai.noi_dung_slide(mat_id, page) if quiz_ai else ""
            self.send_json({"materialId": mat_id, "page": page, "text": text})
            return

        # Toàn văn cả bộ slide — cho tính năng "giảng cả file".
        # Cắt theo NGÂN SÁCH KÝ TỰ chứ không gửi mù: 29 trang có thể vượt cửa sổ
        # ngữ cảnh, mà vượt thì model lặng lẽ cắt mất phần đuôi và giảng thiếu
        # nửa sau bài — đúng kiểu lỗi không ai phát hiện ra lúc demo.
        if self.path.startswith("/api/deck-text"):
            q = self._query()
            mat_id = q.get("materialId", [""])[0]
            ngan_sach = int(q.get("maxChars", ["30000"])[0])
            phan, tong, het = [], 0, 0
            if quiz_ai is not None:
                quiz_ai.noi_dung_slide(mat_id, 1)   # ép nạp slides.json
                trang_map = (quiz_ai._SLIDES or {}).get(mat_id) or {}
                khoa = sorted(trang_map, key=lambda x: int(x) if str(x).isdigit() else 0)
                for so in khoa:
                    noi = (trang_map[so] or "").strip()
                    if not noi:
                        continue
                    khoi = f"[Trang {so}]\n{noi}"
                    if tong + len(khoi) > ngan_sach:
                        het = len([k for k in khoa if int(k) >= int(so)])
                        break
                    phan.append(khoi)
                    tong += len(khoi)
            self.send_json({
                "materialId": mat_id,
                "text": "\n\n".join(phan),
                "soTrang": len(phan),
                "soTrangBiCat": het,
                "soKyTu": tong,
            })
            return

        # Dàn ý cả bộ slide: dòng đầu (thường là tiêu đề) của từng trang.
        # KHÔNG gọi model — đây là dữ liệu trích thẳng từ PDF, nên nó không bịa
        # được trang nào. Mindmap dựng từ đây là dàn ý thật của bài giảng.
        if self.path.startswith("/api/outline"):
            mat_id = self._query().get("materialId", [""])[0]
            muc = []
            if quiz_ai is not None:
                quiz_ai.noi_dung_slide(mat_id, 1)   # ép nạp slides.json
                trang_map = (quiz_ai._SLIDES or {}).get(mat_id) or {}
                for so in sorted(trang_map, key=lambda x: int(x) if str(x).isdigit() else 0):
                    dong = [d.strip() for d in (trang_map[so] or "").split("\n") if d.strip()]
                    if not dong:
                        continue
                    tieu_de = dong[0]
                    if len(tieu_de) > 90:
                        tieu_de = tieu_de[:90].rstrip() + "…"
                    muc.append({"trang": int(so), "tieuDe": tieu_de})
            self.send_json({"materialId": mat_id, "muc": muc})
            return

        super().do_GET()

    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length)
        try:
            payload = json.loads(raw.decode("utf-8") or "{}")
        except json.JSONDecodeError:
            self.send_json({"error": "Dữ liệu gửi lên không hợp lệ."})
            return

        # ---- LỚP 1: heartbeat "tôi đang ở trang này" -------------------------
        if self.path == "/api/presence":
            user_id = payload.get("userId", "anon")
            mat_id = payload.get("materialId", "")
            page = payload.get("page", 1)
            now = time.time()
            with STATE_LOCK:
                PRESENCE[user_id] = {
                    "userId": user_id,
                    "userName": payload.get("userName", "Sinh viên"),
                    "materialId": mat_id,
                    "page": page,
                    "lastSeen": now,
                }
                _don_presence(now)
                _don_queue(now)
                cung_trang = [u for u in PRESENCE.values()
                              if u["materialId"] == mat_id and u["page"] == page]
                dang_doi = QUEUE.get(_khoa_o(mat_id, page), [])
                self.send_json({
                    "status": "ok",
                    # đếm cả mình -> giao diện nói "3 người đang mở trang này"
                    "activeSameSlide": len(cung_trang),
                    # số người đã bấm ghép trận và đang chờ (KHÔNG tính mình)
                    "waitingSameSlide": len([v for v in dang_doi
                                             if v["userId"] != user_id]),
                })
            return

        # ---- Soạn đề trước, xếp hàng sau ------------------------------------
        # Tách hẳn khỏi bước ghép: sinh 5 câu mất 15-40 giây ở lần đầu mỗi trang.
        # Nếu làm chung một request thì người vào trước phải ôm cả thời gian soạn
        # đề trong lúc "đang tìm đối thủ" — vừa nói sai việc đang làm, vừa khiến
        # hai người không bao giờ gặp nhau trong cùng cửa sổ thời gian.
        if self.path == "/api/quiz/prepare":
            mat_id = payload.get("materialId", "")
            page = payload.get("page", 1)
            slide_text = quiz_ai.noi_dung_slide(mat_id, page) if quiz_ai else ""
            questions = get_quiz_questions(
                page,
                doan_boi_den=payload.get("selectedText", ""),
                noi_dung_slide=slide_text,
                yeu_cau=payload.get("yeuCau", "Kiem tra hieu slide nay"),
                material_id=mat_id,
            )
            if isinstance(questions, dict):  # thieu_can_cu / hoi_lai / tu_choi
                self.send_json({
                    "ok": False,
                    "tu_choi": True,
                    "hanh_dong": questions.get("hanh_dong"),
                    "thong_bao": questions.get("thong_bao", ""),
                })
                return
            self.send_json({
                "ok": True,
                "soCau": min(SO_CAU, len(questions)),
                "nguon": questions[0].get("nguon", "?") if questions else "?",
            })
            return

        # ---- LỚP 2: vé xếp hàng "tôi muốn đấu, ngay bây giờ" ----------------
        if self.path == "/api/quiz/queue":
            user_id = payload.get("userId", "anon")
            user_name = payload.get("userName", "Sinh viên")
            mat_id = payload.get("materialId", "")
            page = payload.get("page", 1)
            now = time.time()

            with STATE_LOCK:
                _don_queue(now)
                # Đã ở trong phòng rồi (vd F5 giữa trận) -> trả lại đúng phòng cũ.
                cu = USER_ROOM.get(user_id)
                if cu and cu in ACTIVE_ROOMS:
                    tick(ACTIVE_ROOMS[cu])
                    self.send_json({"matched": True, "room": _goi_phong(ACTIVE_ROOMS[cu])})
                    return

                khoa = _khoa_o(mat_id, page)
                hang = QUEUE.setdefault(khoa, [])
                # Người đợi lâu nhất được ghép trước (FIFO), và phải khác mình.
                doi_thu = next((v for v in hang if v["userId"] != user_id), None)

                if doi_thu:
                    hang.remove(doi_thu)
                    _bo_khoi_queue(user_id)
                    questions = _de_cho(mat_id, page)
                    if isinstance(questions, dict):
                        self.send_json({"matched": False, "error": "chua_co_de"})
                        return
                    # Người đợi trước là p1 — họ vào hàng trước thì được đứng trước.
                    room = _tao_phong(
                        mat_id, page, questions[:SO_CAU],
                        _nguoi_choi(doi_thu["userId"], doi_thu["userName"]),
                        _nguoi_choi(user_id, user_name),
                        "human")
                    self.send_json({"matched": True, "room": _goi_phong(room)})
                    return

                hang.append({"userId": user_id, "veId": payload.get("veId", ""),
                             "userName": user_name,
                             "materialId": mat_id, "page": page,
                             "joinedAt": now, "lastSeen": now})
                self.send_json({"matched": False, "waiting": True,
                                "doiToiDaSec": BOT_SAU})
            return

        # ---- Poll vé: vẫn đợi? đã ghép? hay hết giờ -> ghép bot -------------
        if self.path == "/api/quiz/ticket":
            user_id = payload.get("userId", "anon")
            mat_id = payload.get("materialId", "")
            page = payload.get("page", 1)
            now = time.time()

            with STATE_LOCK:
                _don_queue(now)
                rid = USER_ROOM.get(user_id)
                if rid and rid in ACTIVE_ROOMS:
                    tick(ACTIVE_ROOMS[rid])
                    self.send_json({"matched": True, "room": _goi_phong(ACTIVE_ROOMS[rid])})
                    return

                khoa = _khoa_o(mat_id, page)
                hang = QUEUE.get(khoa, [])
                ve = next((v for v in hang if v["userId"] == user_id), None)
                if not ve:
                    # Vé đã hết hạn (mạng ngắt giữa chừng) -> xếp lại, không im lặng.
                    ve = {"userId": user_id, "veId": payload.get("veId", ""),
                          "userName": payload.get("userName", "Sinh viên"),
                          "materialId": mat_id, "page": page,
                          "joinedAt": now, "lastSeen": now}
                    QUEUE.setdefault(khoa, []).append(ve)
                ve["lastSeen"] = now
                cho = now - ve["joinedAt"]

                if cho >= BOT_SAU:
                    _bo_khoi_queue(user_id)
                    questions = _de_cho(mat_id, page)
                    if isinstance(questions, dict):
                        self.send_json({"matched": False, "error": "chua_co_de"})
                        return
                    bot = _nguoi_choi("bot_" + str(random.randint(1000, 9999)),
                                      random.choice(BOT_NAMES), is_bot=True)
                    room = _tao_phong(
                        mat_id, page, questions[:SO_CAU],
                        _nguoi_choi(user_id, ve["userName"]), bot, "bot")
                    self.send_json({"matched": True, "room": _goi_phong(room)})
                    return

                self.send_json({
                    "matched": False,
                    "waiting": True,
                    "choSec": round(cho, 1),
                    "conLaiSec": round(max(0.0, BOT_SAU - cho), 1),
                    "cungHang": len([v for v in QUEUE.get(khoa, [])
                                     if v["userId"] != user_id]),
                })
            return

        # ---- Rời hàng đợi / rời phòng ---------------------------------------
        if self.path == "/api/quiz/leave":
            user_id = payload.get("userId", "anon")
            with STATE_LOCK:
                _bo_khoi_queue(user_id, payload.get("veId", ""))
                USER_ROOM.pop(user_id, None)
            self.send_json({"status": "ok"})
            return

        # ---- LỚP 3: nộp đáp án. Server chấm, client không tự tính điểm ------
        if self.path == "/api/quiz/submit":
            room_id = payload.get("roomId")
            user_id = payload.get("userId")
            q_idx = int(payload.get("questionIndex", 0))
            selected = int(payload.get("selectedOption", -1))

            with STATE_LOCK:
                room = ACTIVE_ROOMS.get(room_id)
                if not room:
                    self.send_json({"error": "Phòng không tồn tại"}, status=404)
                    return
                tick(room)

                p_key = "p1" if room["p1"]["userId"] == user_id else "p2"
                # Nộp muộn (đã sang REVEAL) hoặc nộp nhầm câu -> bỏ qua, không
                # cộng điểm. Nếu không chặn, bấm nhanh tay lúc chuyển câu sẽ ghi
                # đè đáp án của câu trước.
                if room["phase"] != "QUESTION" or q_idx != room["qIndex"]:
                    self.send_json(_goi_phong(room))
                    return

                tl = _tra_loi_cua(room, q_idx)
                if user_id in tl:      # đã trả lời rồi, không cho đổi
                    self.send_json(_goi_phong(room))
                    return

                con_lai = max(0.0, room["phaseEndsAt"] - time.time())
                tl[user_id] = _cham(room, p_key, room["questions"][q_idx],
                                    selected, con_lai)
                tick(room)             # cả hai đã trả lời -> sang REVEAL ngay
                self.send_json(_goi_phong(room))
            return

        if self.path == "/api/tutor":
            if TUTOR_MODE == "nim":
                data = nim_reply(payload)
            else:
                data = mock_reply(payload.get("messages", []))
            self.send_json(data)
            return

        self.send_json({"error": "Endpoint không tồn tại."}, status=404)

    def send_json(self, data, status=200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


def prewarm():
    """Sinh san bo cau hoi cho cac trang co noi dung trong slides.json.

    Chay o luong nen ngay khi khoi dong. Muc dich: luc demo bam nut la co de
    ngay, thay vi doi 12-25 giay cho model soan. Day KHONG phai cache gia —
    van la cau hoi do AI sinh that, chi la sinh truoc.
    """
    if TUTOR_MODE != "nim" or quiz_ai is None or not quiz_ai.san_sang():
        return
    try:
        slides = json.loads((ROOT / "slides.json").read_text(encoding="utf-8"))
    except Exception:
        return
    # Chi ham nong danh sach trang dung cho demo. Duyet het 58 trang cua data
    # pack se mat ~30 phut va dot rat nhieu luot goi API ma khong dung toi.
    # Doi bang bien moi truong PREWARM_PAGES, vd "material_d1_hackathon:5,6".
    mac_dinh = {
        "material_ms5rpr5o_wgl8wy": ["36", "37", "38", "39"],
        "material_d1_hackathon": ["5"],
        "material_d2_hackathon": ["3"],
    }
    cau_hinh = os.environ.get("PREWARM_PAGES", "").strip()
    if cau_hinh:
        mac_dinh = {}
        for phan in cau_hinh.split(","):
            if ":" in phan:
                mid, tr = phan.split(":", 1)
                mac_dinh.setdefault(mid.strip(), []).append(tr.strip())

    for mat_id, trang_map in slides.items():
        if mat_id.startswith("_"):
            continue
        for trang in mac_dinh.get(mat_id, []):
            if trang not in trang_map:
                continue
            try:
                t0 = time.time()
                q = get_quiz_questions(trang, noi_dung_slide=trang_map[trang],
                                       yeu_cau="Kiem tra hieu slide nay",
                                       material_id=mat_id)
                nguon = q[0].get("nguon") if isinstance(q, list) and q else "?"
                print(f"  [prewarm] trang {trang}: {nguon} ({time.time()-t0:.0f}s)",
                      flush=True)
            except Exception as e:
                print(f"  [prewarm] trang {trang} loi: {e}", flush=True)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"VLearn Reader: http://localhost:{PORT} TUTOR_MODE={TUTOR_MODE}", flush=True)
    threading.Thread(target=prewarm, daemon=True).start()
    threading.Thread(target=vong_don_dep, daemon=True).start()
    server.serve_forever()
