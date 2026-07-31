// ============================================================
// VLearn Quiz Battle — phía client
//
// Client Ở ĐÂY KHÔNG GIỮ LUẬT CHƠI. Đồng hồ, điểm, việc sang câu đều do server
// quyết (xem khối "CƠ CHẾ GHÉP TRẬN" trong server.py). Lớp này chỉ làm ba việc:
//   1. đi qua ba bước soạn đề -> xếp hàng -> vào phòng
//   2. poll trạng thái phòng và báo cho giao diện vẽ lại
//   3. nội suy đồng hồ giữa hai lần poll cho mượt (có bù lệch giờ máy)
//
// Bản cũ tự đếm ngược 15 giây trong setInterval và tự quyết lúc nào sang câu.
// Với đối thủ là bot thì không lộ, nhưng hai người thật sẽ trôi lệch nhau vài
// giây rồi thấy hai màn hình khác nhau — nên toàn bộ phần đó đã bỏ.
// ============================================================

const CHU_KY_POLL_PHONG = 700;   // ms
const CHU_KY_POLL_VE = 1000;     // ms
const CHU_KY_VE_LAI = 200;       // ms — chỉ để đồng hồ chạy mượt

export class QuizAudio {
  constructor() {
    this.ctx = null;
    this.tat = false;
  }

  init() {
    if (this.tat) return;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  playTone(freq, type, duration, gainValue = 0.15) {
    try {
      this.init();
      if (!this.ctx || this.tat) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainValue, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (_) {}
  }

  _chuoi(notes, type) {
    try {
      this.init();
      if (!this.ctx || this.tat) return;
      const now = this.ctx.currentTime;
      notes.forEach((n) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(n.f, now + n.t);
        gain.gain.setValueAtTime(n.g ?? 0.16, now + n.t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + n.t + n.d);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d);
      });
    } catch (_) {}
  }

  playTick() { this.playTone(800, "sine", 0.05, 0.06); }
  playClick() { this.playTone(600, "triangle", 0.08, 0.1); }

  playCorrect() {
    this._chuoi([523.25, 659.25, 783.99, 1046.5].map((f, i) =>
      ({ f, t: i * 0.08, d: 0.3 })), "sine");
  }

  playWrong() {
    this._chuoi([220, 196, 174].map((f, i) =>
      ({ f, t: i * 0.1, d: 0.25, g: 0.16 })), "sawtooth");
  }

  playVictory() {
    this._chuoi([
      { f: 523.25, d: 0.15, t: 0 },
      { f: 659.25, d: 0.15, t: 0.15 },
      { f: 783.99, d: 0.15, t: 0.3 },
      { f: 1046.5, d: 0.4, t: 0.45 },
    ], "triangle");
  }
}

// Bốn đáp án, bốn hình + bốn màu. Giữ ký hiệu hình học (không chỉ dựa vào màu)
// để người mù màu vẫn phân biệt được — cùng lý do bảng màu có thêm chữ A/B/C/D.
export const OPTION_COLORS = [
  { name: "Đỏ", bg: "#dc2b3f", icon: "▲", label: "A" },
  { name: "Xanh dương", bg: "#1a6fd4", icon: "◆", label: "B" },
  { name: "Vàng", bg: "#d09400", icon: "●", label: "C" },
  { name: "Xanh lá", bg: "#1f8f3c", icon: "■", label: "D" },
];

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export class QuizBattleSession {
  constructor(options = {}) {
    this.userId = options.userId || "user_" + Math.random().toString(36).slice(2, 8);
    // Mã vé riêng cho MỖI phiên, dù cùng một userId.
    //
    // Bấm "Đấu lại trang này" sẽ huỷ phiên cũ rồi tạo phiên mới ngay. Lệnh
    // /api/quiz/leave của phiên cũ đi bằng sendBeacon nên bất đồng bộ — nó có
    // thể về SAU lượt /api/quiz/queue của phiên mới và xoá đúng cái vé vừa
    // tạo, để người chơi đứng đợi mãi không ghép được ai.
    // Có mã vé thì leave chỉ xoá được vé của chính nó.
    this.veId = "ve_" + Math.random().toString(36).slice(2, 10);
    this.userName = options.userName || "Sinh viên";
    this.materialId = options.materialId || "";
    this.page = options.page || 1;
    this.doanBoiDen = options.doanBoiDen || "";
    this.onUpdate = options.onUpdate || (() => {});
    this.audio = new QuizAudio();

    // PREPARING | REFUSED | QUEUEING | COUNTDOWN | QUESTION | REVEAL | FINISHED | ERROR
    this.state = "PREPARING";
    this.room = null;
    this.qIndex = 0;
    this.selectedOption = null;
    this.showExplanations = false;
    this.doneRecorded = false;

    this.thongBao = "";        // lời từ chối của AI, hiện nguyên văn cho học viên
    this.hanhDong = "";        // thieu_can_cu | hoi_lai | tu_choi
    this.nguonDe = "";         // "ai" hoặc "mock" — nói thẳng đề ở đâu ra
    this.soCau = 5;

    this.searchTimer = 0;      // giây đã chờ ghép
    this.conLaiGhep = null;    // giây còn lại trước khi ghép bot
    this.cungHang = 0;         // số người khác cũng đang xếp hàng ở trang này
    this.timer = 0;            // giây còn lại của phase hiện tại (nội suy)

    this.serverOffset = 0;     // serverNow - localNow, để bù lệch đồng hồ máy
    this._huy = false;
    this._timers = [];
    this._phaseTruoc = "";
    this._qIndexTruoc = -1;
  }

  _dat(fn, ms) {
    const id = setInterval(() => { if (!this._huy) fn(); }, ms);
    this._timers.push(id);
    return id;
  }

  _now() { return Date.now() / 1000 + this.serverOffset; }

  _apDungPhong(room) {
    if (!room) return;
    if (room.serverNow) this.serverOffset = room.serverNow - Date.now() / 1000;
    this.room = room;
    this.soCau = room.soCau || 5;

    if (room.qIndex !== this.qIndex) {
      this.qIndex = room.qIndex;
      this.selectedOption = null;
    }
    // Khôi phục lựa chọn khi F5 giữa trận: đáp án nằm ở server, không ở client.
    const tl = (room.answers || {})[String(room.qIndex)] || {};
    const cua_toi = tl[this.userId];
    if (cua_toi && this.selectedOption === null) {
      this.selectedOption = cua_toi.selectedOption;
    }

    const phase = room.phase;
    if (phase !== this._phaseTruoc || room.qIndex !== this._qIndexTruoc) {
      if (phase === "REVEAL" && cua_toi) {
        cua_toi.isCorrect ? this.audio.playCorrect() : this.audio.playWrong();
      }
      if (phase === "FINISHED") this.audio.playVictory();
      this._phaseTruoc = phase;
      this._qIndexTruoc = room.qIndex;
    }
    this.state = phase;
    if (phase === "FINISHED") this._dungPoll();
  }

  /** Người chơi hiện tại và đối thủ — không giả định mình luôn là p1. */
  toi() {
    if (!this.room) return null;
    return this.room.p1.userId === this.userId ? this.room.p1 : this.room.p2;
  }

  doiThu() {
    if (!this.room) return null;
    return this.room.p1.userId === this.userId ? this.room.p2 : this.room.p1;
  }

  cauHienTai() {
    return this.room?.questions?.[this.qIndex] || null;
  }

  traLoiCua(userId) {
    return (this.room?.answers || {})[String(this.qIndex)]?.[userId] || null;
  }

  // ---------------------------------------------------------------- luồng chính
  async batDau() {
    this.audio.init();
    this.state = "PREPARING";
    this.searchTimer = 0;
    this.onUpdate();

    this._dat(() => { this.searchTimer += 1; this.onUpdate(); }, 1000);

    let kq;
    try {
      kq = await postJSON("/api/quiz/prepare", {
        userId: this.userId,
        materialId: this.materialId,
        page: this.page,
        selectedText: this.doanBoiDen,
        yeuCau: "Kiem tra hieu slide nay",
      });
    } catch (err) {
      this.state = "ERROR";
      this.thongBao = "Không gọi được server. Kiểm tra lại server.py có đang chạy không.";
      this.onUpdate();
      return;
    }
    if (this._huy) return;

    if (!kq.ok) {
      // AI từ chối ra đề (thiếu căn cứ / hỏi lại / từ chối). Hiện nguyên văn —
      // đây là hành vi ĐÚNG của sản phẩm, không phải lỗi cần giấu.
      this.state = "REFUSED";
      this.hanhDong = kq.hanh_dong || "";
      this.thongBao = kq.thong_bao || "AI chưa đủ căn cứ để ra đề từ trang này.";
      this.onUpdate();
      return;
    }
    this.nguonDe = kq.nguon || "";
    this.soCau = kq.soCau || 5;

    await this._xepHang();
  }

  async _xepHang() {
    this.state = "QUEUEING";
    this.searchTimer = 0;
    this.onUpdate();

    let kq;
    try {
      kq = await postJSON("/api/quiz/queue", {
        userId: this.userId,
        veId: this.veId,
        userName: this.userName,
        materialId: this.materialId,
        page: this.page,
      });
    } catch (err) {
      this.state = "ERROR";
      this.thongBao = "Mất kết nối tới server khi xếp hàng.";
      this.onUpdate();
      return;
    }
    if (this._huy) return;

    if (kq.matched) {
      this._vaoPhong(kq.room);
      return;
    }
    this.conLaiGhep = kq.doiToiDaSec ?? null;
    this.onUpdate();
    this._pollVe();
  }

  _pollVe() {
    const id = this._dat(async () => {
      if (this.state !== "QUEUEING") { clearInterval(id); return; }
      try {
        const kq = await postJSON("/api/quiz/ticket", {
          userId: this.userId,
          veId: this.veId,
          userName: this.userName,
          materialId: this.materialId,
          page: this.page,
        });
        if (this._huy) return;
        if (kq.matched) {
          clearInterval(id);
          this._vaoPhong(kq.room);
          return;
        }
        this.conLaiGhep = kq.conLaiSec ?? null;
        this.cungHang = kq.cungHang || 0;
        this.onUpdate();
      } catch (_) { /* mạng chớp tắt -> lần poll sau thử lại */ }
    }, CHU_KY_POLL_VE);
  }

  _vaoPhong(room) {
    this._apDungPhong(room);
    this.onUpdate();

    // Poll trạng thái thật từ server...
    this._pollPhongId = this._dat(() => this._nhipPhong(), CHU_KY_POLL_PHONG);
    // ...và vẽ lại dày hơn để thanh đồng hồ không giật.
    this._veLaiId = this._dat(() => {
      if (!this.room) return;
      this.timer = Math.max(0, (this.room.phaseEndsAt || 0) - this._now());
      if (this.state === "QUESTION" && this.timer <= 3.05 && this.timer > 0
          && Math.abs(this.timer - Math.round(this.timer)) < 0.11) {
        this.audio.playTick();
      }
      this.onUpdate();
    }, CHU_KY_VE_LAI);
  }

  async _nhipPhong() {
    if (!this.room || this.state === "FINISHED") return;
    try {
      const res = await fetch(`/api/quiz/room?id=${encodeURIComponent(this.room.id)}`);
      if (!res.ok) return;
      const room = await res.json();
      if (this._huy || room.error) return;
      this._apDungPhong(room);
      this.onUpdate();
    } catch (_) {}
  }

  _dungPoll() {
    if (this._pollPhongId) clearInterval(this._pollPhongId);
    if (this._veLaiId) clearInterval(this._veLaiId);
  }

  async selectOption(optIndex) {
    if (this.state !== "QUESTION" || this.selectedOption !== null) return;
    this.selectedOption = optIndex;
    this.audio.playClick();
    this.onUpdate();
    try {
      const room = await postJSON("/api/quiz/submit", {
        roomId: this.room.id,
        userId: this.userId,
        questionIndex: this.qIndex,
        selectedOption: optIndex,
      });
      if (this._huy || room.error) return;
      this._apDungPhong(room);
      this.onUpdate();
    } catch (_) {
      // Nộp hỏng thì server vẫn tính hết giờ ở nhịp poll sau — không mất lượt.
    }
  }

  toggleExplanations() {
    this.showExplanations = !this.showExplanations;
    this.onUpdate();
  }

  destroy() {
    this._huy = true;
    this._timers.forEach(clearInterval);
    this._timers = [];
    // Rời hàng đợi để người khác không bị ghép với một cái vé đã bỏ.
    try {
      navigator.sendBeacon?.(
        "/api/quiz/leave",
        new Blob([JSON.stringify({ userId: this.userId, veId: this.veId })],
                 { type: "application/json" }),
      );
    } catch (_) {
      fetch("/api/quiz/leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: this.userId, veId: this.veId }),
        keepalive: true,
      }).catch(() => {});
    }
  }
}
