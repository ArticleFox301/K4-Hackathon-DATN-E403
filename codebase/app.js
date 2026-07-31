import { get as apiGet } from "./vlearn-api.js";
import { icon } from "./icons.js";
import { TutorClient } from "./tutor.js";
import { QuizBattleSession, OPTION_COLORS } from "./quiz-engine.js";

const START_PAGE = 37;
const DEFAULT_ZOOM = 155;
const HEARTBEAT_MS = 5000;

// Thưởng XP. Đặt ở đây để đọc một chỗ là biết hệ thống đang khuyến khích gì:
// trả lời đúng > ghi chú > bôi đen. Không thưởng cho việc chỉ lật trang.
const XP_QUIZ_DUNG = 20;
const XP_GHI_CHU = 5;
const XP_BOI_DEN = 4;

const NGAN_SACH_CA_FILE = 30000; // ký tự tối đa gửi kèm khi "giảng cả file"

const TUTOR_SYSTEM_PROMPT = "Bạn là VLearn Tutor, trợ lý học tập theo ngữ cảnh cho khoá COMP2010. Trả lời ngắn gọn, rõ ràng bằng tiếng Việt, bám sát nội dung slide được cung cấp. Nếu ngữ cảnh không đề cập điều được hỏi, hãy nói thẳng là slide không nói tới thay vì suy đoán.";

const TUTOR_SYSTEM_CA_FILE = "Bạn là VLearn Tutor, giảng lại toàn bộ một bộ slide cho học viên khoá COMP2010. Bạn được cung cấp văn bản trích từ nhiều trang, mỗi trang mở đầu bằng [Trang N]. Hãy giảng theo mạch bài, chia phần rõ ràng và LUÔN ghi số trang nguồn cho mỗi ý (dạng [Trang N]). Chỉ dùng nội dung có trong văn bản được cấp; phần nào không có thì nói là bộ slide không đề cập.";

const T = {
  vi: {
    student: "Sinh viên ẩn danh",
    read: "Đọc",
    pen: "Bút",
    eraser: "Tẩy",
    crop: "Khoanh vùng",
    clearInk: "Xoá nét",
    highlight: "Highlight",
    page: "Trang",
    trang: "trang",
    quota: "Quota Tutor trong ngày",
    cau: "câu",
    tutorDesc: "Trợ lý học theo ngữ cảnh",
    placeholder: "Nhập câu hỏi hoặc bôi đen tài liệu...",
    sumSlide: "Tóm tắt slide này",
    explain: "Giải thích đơn giản",
    threePoints: "Tóm tắt 3 ý",
    example: "Cho ví dụ thực tế",
    teachDeck: "Giảng cả file",
    mindmap: "Dàn ý cả file",
    fullscreen: "Toàn màn hình",
    notes: "Ghi chú",
    navDashboard: "Trang chủ",
    navCourses: "Khóa học",
    navReader: "Đọc slide",
    navNotebook: "Sổ tay",
    heroKicker: "VLearn · VinUni AI Thực Chiến",
    welcomeBack: "Chào mừng trở lại",
    heroDesc: "VLearn đang tổng hợp tiến độ đọc và các tín hiệu học tập của bạn. Bấm chọn khóa học để xem danh sách bài học hoặc trao đổi cùng VLearn Tutor.",
    statTutor: "Hỏi VLearn Tutor",
    statQuizDone: "Quiz đã hoàn thành",
    statReadPct: "% đã đọc",
    ctaCourses: "Xem khóa học của tôi",
    ctaCoursesDesc: "Mở danh sách đầy đủ các lớp bạn đang theo học để chọn bài giảng slide.",
    enterCourseList: "Vào danh sách lớp",
    myCoursesTitle: "Khóa học của tôi",
    myCoursesDesc: "Danh sách các lớp bạn đang tham gia. Bấm chọn lớp để mở bài đọc slide.",
    enrolledClass: "1 lớp đang theo học",
    courseTitle: "COMP2010 - Khóa 3 + 4 Phase 1",
    courseDesc: "VinUni AI Thực Chiến (Prompt Engineering, RAG & Agentic Loop).",
    readDone: "đã đọc",
    btnNotebook: "Sổ tay học tập",
    btnStudySlide: "Vào học slide",
    notebookTitle: "Sổ tay học tập · COMP2010",
    notebookDesc: "Tổng hợp các trang em từng ghi chú, bôi đen, hỏi AI và luyện tập flashcard 3D.",
    tabNotes: "Danh sách Ghi chú",
    tabFlashcard: "Flashcard 3D",
    statNotes: "Ghi chú",
    statHighlights: "Đoạn đánh dấu",
    statReviewPages: "Trang cần ôn",
    statReadSignals: "Tín hiệu đọc",
    emptyReviewTitle: "Chưa có dữ liệu ôn tập cá nhân",
    emptyReviewDesc: "Khi em đọc slide, ghi chú, bôi đen hoặc hỏi AI, hệ thống sẽ gom lại ở đây để em biết trang nào nên ôn trước.",
    openMaterials: "Mở học liệu",
    flashcardTitle: "Thẻ ôn tập Flashcard",
    flashcardDesc: "Bấm vào mặt thẻ để lật và tự kiểm tra.",
    cardCount: "thẻ",
    clickFlip: "Bấm để lật thẻ",
    sourceNote: "Ghi chú đã lưu",
    sourceWrongQuiz: "Câu quiz trả lời sai",
    cardAnswer: "Mặt sau",
    highlightSelection: "Highlight",
    askTutorSelection: "Hỏi Tutor",
    saveNotebookSelection: "Lưu sổ tay",
    savedFromPage: "Lưu từ trang",
    correctAnswer: "Đáp án đúng",
    yourAnswer: "Bạn đã chọn",
    srsKnow: "Đã thuộc",
    srsAgain: "Cần ôn lại",
    srsKnown: "Đã đánh dấu thuộc",
    srsPending: "Đang chờ ôn lại",
    textLayer: "Văn bản trích từ trang này",
    textLayerHint: "Đây đúng là ngữ cảnh mà AI đọc. Bôi đen một đoạn để hỏi Tutor, highlight hoặc lưu vào sổ tay.",
    textLayerEmpty: "Trang này không có chữ trích được (trang ảnh thuần).",
    show: "Hiện",
    hide: "Ẩn",
    noteFor: "Ghi chú cá nhân",
    notePlaceholder: "Ghi lại điều quan trọng ở trang này...",
    noteSaved: "Đã lưu",
    noteClear: "Xoá ghi chú trang này",
    suggestLabel: "Gợi ý câu hỏi tiếp",
  },
  en: {
    student: "Anonymous student",
    read: "Read",
    pen: "Pen",
    eraser: "Eraser",
    crop: "Mark region",
    clearInk: "Clear ink",
    highlight: "Highlight",
    page: "Page",
    trang: "pages",
    quota: "Tutor quota today",
    cau: "msgs",
    tutorDesc: "Context-aware study assistant",
    placeholder: "Ask a question or highlight the document...",
    sumSlide: "Summarize this slide",
    explain: "Explain simply",
    threePoints: "Three key points",
    example: "Give a real example",
    teachDeck: "Teach whole deck",
    mindmap: "Deck outline",
    fullscreen: "Fullscreen",
    notes: "Notes",
    navDashboard: "Home",
    navCourses: "Courses",
    navReader: "Read slides",
    navNotebook: "Notebook",
    heroKicker: "VLearn · VinUni Applied AI",
    welcomeBack: "Welcome back",
    heroDesc: "VLearn is collecting your reading progress and learning signals. Open a course to choose slide lessons or continue with VLearn Tutor.",
    statTutor: "VLearn Tutor questions",
    statQuizDone: "Completed quizzes",
    statReadPct: "% read",
    ctaCourses: "View my courses",
    ctaCoursesDesc: "Open the full list of enrolled classes and choose a slide lesson.",
    enterCourseList: "Enter course list",
    myCoursesTitle: "My courses",
    myCoursesDesc: "Classes you are enrolled in. Choose a class to open the slide reader.",
    enrolledClass: "1 active class",
    courseTitle: "COMP2010 - Batch 3 + 4 Phase 1",
    courseDesc: "VinUni Applied AI (Prompt Engineering, RAG & Agentic Loop).",
    readDone: "read",
    btnNotebook: "Study notebook",
    btnStudySlide: "Study slides",
    notebookTitle: "Study notebook · COMP2010",
    notebookDesc: "A collection of your notes, highlights, AI questions, and 3D flashcard practice.",
    tabNotes: "Notes list",
    tabFlashcard: "3D Flashcards",
    statNotes: "Notes",
    statHighlights: "Highlights",
    statReviewPages: "Review pages",
    statReadSignals: "Reading signals",
    emptyReviewTitle: "No personal review data yet",
    emptyReviewDesc: "When you read slides, save notes, highlight text, or ask AI, VLearn will collect those signals here so you know which pages to review first.",
    openMaterials: "Open materials",
    flashcardTitle: "Review flashcards",
    flashcardDesc: "Click a card to flip it and self-check.",
    cardCount: "cards",
    clickFlip: "Click to flip",
    sourceNote: "Saved note",
    sourceWrongQuiz: "Missed quiz question",
    cardAnswer: "Back side",
    highlightSelection: "Highlight",
    askTutorSelection: "Ask Tutor",
    saveNotebookSelection: "Save note",
    savedFromPage: "Saved from page",
    correctAnswer: "Correct answer",
    yourAnswer: "You chose",
    srsKnow: "I know it",
    srsAgain: "Review again",
    srsKnown: "Marked as known",
    srsPending: "Queued for review",
    textLayer: "Text extracted from this page",
    textLayerHint: "This is exactly the context the AI reads. Select any part to ask the Tutor, highlight, or save it.",
    textLayerEmpty: "No extractable text on this page (image-only slide).",
    show: "Show",
    hide: "Hide",
    noteFor: "Personal note",
    notePlaceholder: "Write down what matters on this page...",
    noteSaved: "Saved",
    noteClear: "Clear note for this page",
    suggestLabel: "Suggested follow-ups",
  },
};

function esc(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function ico(name, size, style = "") {
  if (!style) return icon(name, size);
  return icon(name, size).replace("<svg ", `<svg style="${style}" `);
}

function gio() {
  return new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

class VLearnReader {
  constructor(root) {
    this.root = root;
    this.tutor = new TutorClient();
    this.userId = "user_" + Math.random().toString(36).slice(2, 8);
    this.userName = "Học viên " + Math.floor(100 + Math.random() * 900);
    this.quizSession = null;

    // Nét vẽ lưu dưới dạng dataURL theo từng trang. render() xoá sạch DOM nên
    // canvas mất nội dung mỗi lần vẽ lại — phải tự chụp trước và phục hồi sau.
    this.netVe = {};
    this.dangVe = false;
    this.cropTu = null;
    this.selText = "";
    this.selPage = null;

    this.state = {
      view: "reader",
      lectures: [],
      collapsed: {},
      materialId: "material_ms5rpr5o_wgl8wy",
      materialName: "day05-slide-batch03-C401.pdf",
      page: START_PAGE,
      total: 62,
      pageByMat: { material_ms5rpr5o_wgl8wy: START_PAGE },
      slide: { kind: "chart", title: "Trust calibration" },
      zoom: DEFAULT_ZOOM,
      tool: "read",
      leftOpen: true,
      rightOpen: true,
      lang: "vi",
      theme: "dark",
      input: "",
      sending: false,
      quota: 0,
      quotaMax: 15,
      xp: 0,
      pagesSeen: new Set(),
      chuSlide: {},        // "materialId:page" -> văn bản trích từ PDF
      chuMoRong: true,     // mở/đóng khối văn bản dưới slide
      ghiChu: {},          // "materialId:page" -> nội dung ghi chú
      noteOpen: false,
      highlights: [],
      srs: {},             // id thẻ -> "thuoc" | "on_lai"
      wrongQuizItems: [],
      wrongQuizPages: new Set(),
      quizDone: 0,
      notebookTab: "feed",
      goiY: [],            // chip gợi ý câu hỏi tiếp theo
      activeSameSlide: 1,
      waitingSameSlide: 0,
      messages: [
        {
          id: 1,
          isUser: false,
          isBot: true,
          hasContext: false,
          text: "Xin chào! Mình là VLearn Tutor. Mình đọc đúng phần chữ trích từ trang em đang mở — bôi đen một đoạn để hỏi riêng đoạn đó, bấm \"Giảng cả file\" để mình giảng trọn bộ slide, hoặc bấm \"Kiểm tra hiểu\" để đấu quiz.",
        },
      ],
    };
  }

  // ------------------------------------------------------------ khởi động
  async boot() {
    this.render();
    this.dungToolTipBoiDen();
    this.batPhimTat();
    this.batDongNgoai();

    try {
      const lectures = await apiGet("/course/COMP2010/lectures");
      this.setState({ lectures });
      await this.loadPage();
    } catch (err) {
      console.warn("Không tải được dữ liệu demo", err);
    }

    // Heartbeat: bản cũ chỉ gửi presence lúc đổi trang, mà server coi ai im quá
    // 30 giây là đã rời -> ngồi đọc một trang lâu là tự biến mất khỏi danh sách.
    this.sendPresence();
    setInterval(() => this.sendPresence(), HEARTBEAT_MS);
  }

  async sendPresence() {
    try {
      const res = await fetch("/api/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: this.userId,
          userName: this.userName,
          materialId: this.state.materialId,
          page: this.state.page,
        }),
      });
      const data = await res.json();
      const a = data.activeSameSlide ?? this.state.activeSameSlide;
      const w = data.waitingSameSlide ?? 0;
      if (a !== this.state.activeSameSlide || w !== this.state.waitingSameSlide) {
        this.state.activeSameSlide = a;
        this.state.waitingSameSlide = w;
        // Đang trong trận thì không vẽ lại nền, tránh giật overlay.
        if (!this.quizSession) this.render();
      }
    } catch (_) {}
  }

  setState(patch, afterRender) {
    const next = typeof patch === "function" ? patch(this.state) : patch;
    this.state = { ...this.state, ...next };
    this.render();
    if (afterRender) afterRender();
  }

  khoaTrang(materialId = this.state.materialId, page = this.state.page) {
    return `${materialId}:${page}`;
  }

  // ------------------------------------------------------------ tải trang
  async loadPage() {
    const { materialId, page } = this.state;
    try {
      const slide = await apiGet(`/materials/${materialId}/pages/${page}`);
      this.setState({ slide, total: slide.total });
      this.sendPresence();
    } catch (err) {
      console.warn("Không tải được trang", err);
    }
    this.napChuSlide(materialId, page);
  }

  /** Lấy VĂN BẢN THẬT của trang từ slides.json (do ingest_slides.py trích ra).
   *
   *  Đây là chỗ vá lỗi "Tutor giảng sai": slide thật hiển thị bằng ảnh .webp nên
   *  slideText() cũ chỉ trả về mỗi tên file, Tutor không có gì để bám và tự bịa
   *  nội dung. Chữ vẫn luôn nằm sẵn ở server, chỉ là client chưa từng hỏi tới.
   */
  async napChuSlide(materialId, page) {
    const key = `${materialId}:${page}`;
    if (this.state.chuSlide[key] !== undefined) return;
    try {
      const res = await fetch(
        `/api/slide-text?materialId=${encodeURIComponent(materialId)}&page=${page}`);
      const data = await res.json();
      this.setState((s) => ({ chuSlide: { ...s.chuSlide, [key]: data.text || "" } }));
    } catch (_) {
      this.setState((s) => ({ chuSlide: { ...s.chuSlide, [key]: "" } }));
    }
  }

  goto(n) {
    const page = Math.max(1, Math.min(this.state.total, n));
    if (page === this.state.page) return;
    this.luuNetVe();
    this.setState((s) => ({
      page,
      pageByMat: { ...s.pageByMat, [s.materialId]: page },
      pagesSeen: new Set([...s.pagesSeen, `${s.materialId}:${page}`]),
    }));
    this.loadPage();
  }

  async selectDoc(id) {
    if (id === this.state.materialId) return;
    this.luuNetVe();
    try {
      const mat = await apiGet(`/materials/${id}`);
      const page = this.state.pageByMat[id] || 1;
      this.setState((s) => ({
        materialId: id,
        materialName: mat.name,
        total: mat.pages,
        page,
        pageByMat: { ...s.pageByMat, [id]: page },
        pagesSeen: new Set([...s.pagesSeen, `${id}:${page}`]),
      }));
      await this.loadPage();
    } catch (err) {
      console.warn("Không chọn được tài liệu", err);
    }
  }

  /** Ngữ cảnh gửi cho Tutor. Ưu tiên chữ trích từ PDF; slide mô phỏng thì dựng
   *  lại từ tiêu đề + bullet. Không còn nhánh nào trả về chuỗi rỗng. */
  slideText() {
    const chu = this.state.chuSlide[this.khoaTrang()];
    if (chu && chu.trim().length > 20) return chu.trim();

    const s = this.state.slide || {};
    if (s.kind === "chart") {
      return 'Slide "Trust calibration": biểu đồ hai trục — Trust in AI system (dọc) và AI capability (ngang). Overtrust = lòng tin vượt năng lực AI; Distrust = lòng tin thấp hơn năng lực AI; đường chéo Calibrated trust là mục tiêu thiết kế.';
    }
    let text = `${s.title || ""}. `;
    if (s.highlight) text += `${s.highlight}. `;
    if (s.bullets) text += s.bullets.join(" ");
    text = text.trim();
    return text || "(Trang này không trích được văn bản.)";
  }

  coChuTrang() {
    const chu = this.state.chuSlide[this.khoaTrang()];
    return !!(chu && chu.trim().length > 20);
  }

  // ------------------------------------------------------------ chat Tutor
  themTinNhan(msg) {
    this.setState((s) => ({ messages: [...s.messages, msg] }));
  }

  /** Một lượt hỏi Tutor. `ctxLabel` là nhãn ngữ cảnh hiện trên đầu câu trả lời —
   *  học viên phải nhìn thấy AI đang dựa vào đâu (nguyên tắc G2 trong spec §4b). */
  async hoiTutor({ hienThi, noiDungGui, ctxLabel, system, maxTokens = 800,
                   canhBao = "", ghiChuCho = "" }) {
    if (this.state.sending) return;
    const userMessage = { id: Date.now(), isUser: true, isBot: false, hasContext: false, text: hienThi };
    const base = [...this.state.messages, userMessage];

    // Đồng hồ chờ. Lượt "giảng cả file" đo được mất ~168 giây; không có gì nhúc
    // nhích trong ngần ấy thời gian thì người dùng kết luận là treo và bấm lại,
    // vừa mất lượt vừa tốn thêm một lượt gọi model.
    this.choT0 = Date.now();
    this.ghiChuCho = ghiChuCho;
    clearInterval(this._choTimer);
    this._choTimer = setInterval(() => {
      const el = this.root.querySelector("#vl-cho-sec");
      if (el) el.textContent = Math.round((Date.now() - this.choT0) / 1000);
    }, 1000);

    this.setState({
      messages: base,
      input: "",
      sending: true,
      rightOpen: true,
      quota: Math.min(this.state.quotaMax, this.state.quota + 1),
    });

    try {
      const history = base.slice(-9, -1).map((m) => ({
        role: m.isUser ? "user" : "assistant",
        content: m.text,
      }));
      const reply = await this.tutor.complete({
        system: system || TUTOR_SYSTEM_PROMPT,
        messages: [...history, { role: "user", content: noiDungGui }],
        max_tokens: maxTokens,
      });
      this.setState((s) => ({
        messages: [...s.messages, {
          id: Date.now() + 1,
          isUser: false,
          isBot: true,
          hasContext: true,
          context: ctxLabel,
          canhBao,
          text: reply,
        }],
        sending: false,
        goiY: this.sinhGoiY(),
      }));
      clearInterval(this._choTimer);
    } catch (err) {
      this.setState((s) => ({
        messages: [...s.messages, {
          id: Date.now() + 1,
          isUser: false,
          isBot: true,
          hasContext: true,
          context: ctxLabel,
          text: "AI hiện không thể trả lời. Kiểm tra server.py còn chạy không, rồi thử lại.",
        }],
        sending: false,
      }));
      clearInterval(this._choTimer);
    }
  }

  async send() {
    const text = (this.state.input || "").trim();
    if (!text) return;
    const page = this.state.page;
    await this.hoiTutor({
      hienThi: text,
      noiDungGui: `Nội dung trang ${page} của "${this.state.materialName}":\n"""\n${this.slideText()}\n"""\n\nCâu hỏi của học viên: ${text}`,
      ctxLabel: `Ngữ cảnh: trang ${page} · ${this.slideText().length} ký tự trích từ slide`,
    });
  }

  quickAsk(prompt) {
    this.state.input = prompt;
    this.send();
  }

  /** Giảng CẢ FILE. Gửi toàn văn bộ slide (có cắt theo ngân sách ký tự) thay vì
   *  chỉ một trang, và nói rõ đã cắt bao nhiêu trang để học viên không tưởng
   *  Tutor đã đọc hết trong khi thực tế bị cắt đuôi. */
  async giangCaFile() {
    if (this.state.sending) return;
    const matId = this.state.materialId;
    let data;
    try {
      const res = await fetch(
        `/api/deck-text?materialId=${encodeURIComponent(matId)}&maxChars=${NGAN_SACH_CA_FILE}`);
      data = await res.json();
    } catch (_) {
      data = null;
    }
    if (!data || !data.text) {
      this.themTinNhan({
        id: Date.now(), isUser: false, isBot: true, hasContext: false,
        text: `Bộ "${this.state.materialName}" chưa có văn bản trích. Chạy \`python codebase/ingest_slides.py\` để trích chữ từ data pack rồi thử lại.`,
      });
      return;
    }

    const canhBao = data.soTrangBiCat
      ? `Đã gửi ${data.soTrang} trang đầu (${data.soKyTu} ký tự); ${data.soTrangBiCat} trang cuối bị cắt do vượt ngân sách ngữ cảnh.`
      : "";

    await this.hoiTutor({
      hienThi: `Giảng lại toàn bộ "${this.state.materialName}" (${data.soTrang} trang)`,
      noiDungGui: `Văn bản trích từ bộ slide "${this.state.materialName}":\n"""\n${data.text}\n"""\n\nHãy giảng lại trọn bộ theo mạch bài: mở đầu nêu bộ slide này nói về cái gì, rồi chia 3-6 phần lớn, mỗi phần nêu ý chính kèm [Trang N] làm nguồn, cuối cùng là 3 điều học viên phải nhớ.`,
      ctxLabel: `Ngữ cảnh: ${data.soTrang} trang · ${data.soKyTu} ký tự trích từ cả file`,
      system: TUTOR_SYSTEM_CA_FILE,
      maxTokens: 1800,
      canhBao,
      // Đo thực tế trên bộ 29 trang: ~168 giây. Nói trước con số để người dùng
      // biết là đang chạy chứ không phải treo.
      ghiChuCho: `Đang giảng ${data.soTrang} trang. Bộ slide dài cỡ này thường mất 2–3 phút — cứ để yên, đừng bấm lại.`,
    });
  }

  /** Dàn ý cả file: dòng tiêu đề thật của từng trang, KHÔNG gọi model.
   *  Cây này trích thẳng từ PDF nên không thể bịa ra trang không tồn tại. */
  async danYCaFile() {
    const matId = this.state.materialId;
    let muc = [];
    try {
      const res = await fetch(`/api/outline?materialId=${encodeURIComponent(matId)}`);
      muc = (await res.json()).muc || [];
    } catch (_) {}

    if (!muc.length) {
      this.themTinNhan({
        id: Date.now(), isUser: false, isBot: true, hasContext: false,
        text: `Chưa trích được dàn ý của "${this.state.materialName}". Chạy \`python codebase/ingest_slides.py\` trước.`,
      });
      return;
    }

    const cay = muc.map((m, i) => {
      const cuoi = i === muc.length - 1;
      return `${cuoi ? "└──" : "├──"} [Trang ${m.trang}] ${m.tieuDe}`;
    }).join("\n");

    this.setState((s) => ({
      rightOpen: true,
      messages: [...s.messages, {
        id: Date.now(),
        isUser: false,
        isBot: true,
        hasContext: true,
        context: `Dàn ý ${muc.length} trang · trích thẳng từ PDF, không qua model`,
        tree: `${this.state.materialName}\n${cay}`,
        text: "Dàn ý dưới đây lấy dòng tiêu đề của từng trang trong file. Bấm số trang bất kỳ ở thanh dưới để nhảy tới, hoặc bấm \"Giảng cả file\" để mình giảng theo mạch này.",
      }],
    }));
  }

  newChat() {
    this.setState({
      goiY: [],
      messages: [{
        id: Date.now(),
        isUser: false,
        isBot: true,
        hasContext: false,
        text: `Cuộc trò chuyện mới. Bạn muốn hỏi gì về trang ${this.state.page}?`,
      }],
    });
  }

  /** Chip gợi ý bám theo trang đang mở, không phải câu cố định chung chung. */
  sinhGoiY() {
    const t = T[this.state.lang];
    const p = this.state.page;
    const goi = [
      { label: t.threePoints, prompt: `Tóm tắt 3 ý chính của trang ${p}` },
      { label: t.example, prompt: `Cho một ví dụ thực tế minh hoạ nội dung trang ${p}` },
    ];
    if (p > 1) {
      goi.push({ label: `Liên hệ trang ${p - 1}`, prompt: `Nội dung trang ${p} nối tiếp trang ${p - 1} như thế nào?` });
    }
    goi.push({ label: "Điểm dễ nhầm", prompt: `Ở trang ${p} có khái niệm nào học viên hay hiểu nhầm không?` });
    return goi;
  }

  // ------------------------------------------------------------ bôi đen chữ
  /** Thanh nổi khi bôi đen — tạo MỘT lần ở body, không dựng lại theo render().
   *  Nếu để trong root thì mỗi lần setState là mất selection lẫn thanh nổi. */
  dungToolTipBoiDen() {
    const t = T[this.state.lang];
    const tip = document.createElement("div");
    tip.id = "vl-sel-tip";
    tip.className = "vl-selection-tooltip";
    tip.innerHTML = `
      <button data-sel="ask">${esc(t.askTutorSelection)}</button>
      <button data-sel="hl">${esc(t.highlightSelection)}</button>
      <button data-sel="save">${esc(t.saveNotebookSelection)}</button>`;
    document.body.appendChild(tip);
    this.selTip = tip;

    tip.addEventListener("mousedown", (e) => e.preventDefault()); // giữ selection
    tip.addEventListener("click", (e) => {
      const act = e.target.closest("[data-sel]")?.dataset.sel;
      if (act === "ask") this.hoiDoanBoiDen();
      else if (act === "hl") this.boiDenLuu(false);
      else if (act === "save") this.boiDenLuu(true);
    });

    document.addEventListener("selectionchange", () => {
      const sel = window.getSelection();
      const text = sel ? sel.toString().trim() : "";
      const trongSlide = sel?.anchorNode
        && document.getElementById("vl-slide-text")?.contains(sel.anchorNode);

      if (text.length > 2 && trongSlide) {
        this.selText = text;
        this.selPage = this.state.page;
        const r = sel.getRangeAt(0).getBoundingClientRect();
        tip.classList.add("is-on");
        const w = tip.offsetWidth || 260;
        tip.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2))}px`;
        tip.style.top = `${Math.max(8, r.top - 46)}px`;
      } else {
        tip.classList.remove("is-on");
      }
    });
  }

  anToolTip() {
    this.selTip?.classList.remove("is-on");
    window.getSelection()?.removeAllRanges();
  }

  async hoiDoanBoiDen() {
    const doan = this.selText;
    const trang = this.selPage ?? this.state.page;
    if (!doan) return;
    this.anToolTip();
    await this.hoiTutor({
      hienThi: `Giải thích đoạn bôi đen ở trang ${trang}: "${doan}"`,
      // Gửi CẢ đoạn bôi đen lẫn toàn văn trang: model cần trang để biết đoạn đó
      // nằm trong mạch nào, thiếu nó thì giải thích trôi khỏi ngữ cảnh bài.
      noiDungGui: `Toàn văn trang ${trang}:\n"""\n${this.slideText()}\n"""\n\nHọc viên bôi đen đúng đoạn này:\n"""\n${doan}\n"""\n\nGiải thích riêng đoạn được bôi đen, đặt nó vào mạch của trang. Nếu đoạn này là thuật ngữ, nói rõ nghĩa và cho một ví dụ.`,
      ctxLabel: `Ngữ cảnh: đoạn bôi đen ở trang ${trang} (${doan.length} ký tự)`,
    });
  }

  boiDenLuu(luuSoTay) {
    const doan = this.selText;
    const trang = this.selPage ?? this.state.page;
    if (!doan) return;
    this.anToolTip();
    this.setState((s) => ({
      highlights: [...s.highlights, {
        id: `hl_${Date.now()}`,
        materialId: s.materialId,
        page: trang,
        text: doan,
        time: gio(),
        luuSoTay,
      }],
    }));
    this.themXp(XP_BOI_DEN, luuSoTay ? "+4 XP · đã lưu sổ tay" : "+4 XP · đã highlight");
  }

  // ------------------------------------------------------------ ghi chú trang
  toggleNote() {
    this.setState((s) => ({ noteOpen: !s.noteOpen }), () => {
      if (this.state.noteOpen) this.root.querySelector("#vl-note-input")?.focus();
    });
  }

  luuGhiChu(text) {
    const key = this.khoaTrang();
    const truoc = (this.state.ghiChu[key] || "").trim();
    this.state.ghiChu = { ...this.state.ghiChu, [key]: text };

    const badge = this.root.querySelector("#vl-note-saved");
    if (badge) {
      badge.classList.add("is-on");
      clearTimeout(this._badgeTimer);
      this._badgeTimer = setTimeout(() => badge.classList.remove("is-on"), 1100);
    }
    // Chỉ thưởng lần đầu tiên trang này có ghi chú, không thưởng theo từng phím.
    if (!truoc && text.trim()) this.themXp(XP_GHI_CHU, "+5 XP · ghi chú mới");

    const dot = this.root.querySelector("#vl-note-dot");
    if (dot) dot.style.visibility = text.trim() ? "visible" : "hidden";
  }

  xoaGhiChu() {
    const key = this.khoaTrang();
    const con = { ...this.state.ghiChu };
    delete con[key];
    this.setState({ ghiChu: con });
  }

  // ------------------------------------------------------------ vẽ trên slide
  layCanvas() {
    return this.root.querySelector("#vl-canvas");
  }

  chuanBiCanvas() {
    const cv = this.layCanvas();
    if (!cv) return;

    cv.onmousedown = (e) => this.batDauVe(e);
    cv.onmousemove = (e) => this.dangVeTiep(e);
    cv.onmouseup = (e) => this.ketThucVe(e);
    cv.onmouseleave = (e) => this.ketThucVe(e);

    // Slide thật là ảnh tải bất đồng bộ: ngay sau render, khung còn cao 0 nên
    // đo lúc đó ra 0 và canvas kẹt ở kích thước mặc định 300x150 -> nét bút
    // lệch hẳn khỏi con trỏ. ResizeObserver đo lại mỗi lần khung đổi kích
    // thước (ảnh load xong, đổi zoom, đổi trang), nên không còn phụ thuộc vào
    // việc đoán đúng thời điểm.
    this._quanSat?.disconnect();
    this._quanSat = new ResizeObserver(() => this.doLaiCanvas());
    this._quanSat.observe(cv.parentElement);
    this.doLaiCanvas();
  }

  doLaiCanvas() {
    const cv = this.layCanvas();
    if (!cv) return;
    const stage = cv.parentElement;
    const w = Math.round(stage.clientWidth);
    const h = Math.round(stage.clientHeight);
    if (!w || !h || (cv.width === w && cv.height === h)) return;

    // Đổi width/height của canvas là xoá sạch nội dung -> phải phục hồi lại nét.
    cv.width = w;
    cv.height = h;
    const luu = this.netVe[this.khoaTrang()];
    if (luu) {
      const img = new Image();
      img.onload = () => cv.getContext("2d").drawImage(img, 0, 0, cv.width, cv.height);
      img.src = luu;
    }
  }

  luuNetVe() {
    const cv = this.layCanvas();
    if (!cv || !cv.width) return;
    if (!this._coNet) return;
    this.netVe[this.khoaTrang()] = cv.toDataURL();
  }

  toaDo(e) {
    const cv = this.layCanvas();
    const r = cv.getBoundingClientRect();
    // Card slide bị transform: scale() nên rect khác kích thước nội tại của
    // canvas — phải quy đổi, không thì nét vẽ lệch khỏi con trỏ.
    return {
      x: (e.clientX - r.left) * (cv.width / r.width),
      y: (e.clientY - r.top) * (cv.height / r.height),
    };
  }

  batDauVe(e) {
    if (this.state.tool === "read") return;
    const ctx = this.layCanvas().getContext("2d");
    const p = this.toaDo(e);
    this.dangVe = true;
    this.cropTu = p;
    this._netTruoc = null;
    if (this.state.tool === "crop") {
      this._netTruoc = ctx.getImageData(0, 0, this.layCanvas().width, this.layCanvas().height);
    } else {
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
    }
  }

  dangVeTiep(e) {
    if (!this.dangVe) return;
    const cv = this.layCanvas();
    const ctx = cv.getContext("2d");
    const p = this.toaDo(e);
    const tool = this.state.tool;

    if (tool === "pen") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "#e0453f";
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      this._coNet = true;
    } else if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 24;
      ctx.lineCap = "round";
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      this._coNet = true;
    } else if (tool === "crop") {
      // Khung chọn phải vẽ lại từ ảnh nền cũ, nếu clearRect cả canvas thì kéo
      // khung một cái là bay hết nét bút đã vẽ trước đó.
      ctx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (this._netTruoc) ctx.putImageData(this._netTruoc, 0, 0);
      ctx.strokeStyle = "#e0a83a";
      ctx.lineWidth = 2;
      ctx.setLineDash([7, 5]);
      ctx.strokeRect(this.cropTu.x, this.cropTu.y, p.x - this.cropTu.x, p.y - this.cropTu.y);
      ctx.setLineDash([]);
    }
  }

  ketThucVe(e) {
    if (!this.dangVe) return;
    this.dangVe = false;
    const cv = this.layCanvas();
    if (this.state.tool === "crop") {
      const p = this.toaDo(e);
      const w = Math.abs(p.x - this.cropTu.x);
      const h = Math.abs(p.y - this.cropTu.y);
      if (w > 24 && h > 24) this.hoiVungKhoanh(p);
      const ctx = cv.getContext("2d");
      ctx.clearRect(0, 0, cv.width, cv.height);
      if (this._netTruoc) ctx.putImageData(this._netTruoc, 0, 0);
    }
    this.luuNetVe();
  }

  /** Khoanh vùng rồi hỏi. Model hiện chỉ đọc CHỮ, chưa đọc ảnh — nên câu trả lời
   *  dựa trên văn bản của trang, và tin nhắn nói thẳng điều đó thay vì để học
   *  viên tưởng AI đã "nhìn" thấy vùng khoanh. */
  hoiVungKhoanh(p) {
    const cv = this.layCanvas();
    const x1 = Math.round(Math.min(this.cropTu.x, p.x) / cv.width * 100);
    const y1 = Math.round(Math.min(this.cropTu.y, p.y) / cv.height * 100);
    const x2 = Math.round(Math.max(this.cropTu.x, p.x) / cv.width * 100);
    const y2 = Math.round(Math.max(this.cropTu.y, p.y) / cv.height * 100);
    const viTri = `khoảng ${x1}%–${x2}% chiều ngang, ${y1}%–${y2}% chiều dọc`;

    this.hoiTutor({
      hienThi: `Giải thích vùng tôi khoanh ở trang ${this.state.page} (${viTri})`,
      noiDungGui: `Toàn văn trang ${this.state.page}:\n"""\n${this.slideText()}\n"""\n\nHọc viên khoanh một vùng ở ${viTri} của trang. Dựa trên văn bản trên, đoán xem phần nào của trang rơi vào vùng đó và giải thích phần đó. Nếu không đủ căn cứ để xác định, nói thẳng là không xác định được vùng nào và đề nghị học viên bôi đen chữ thay vì khoanh vùng.`,
      ctxLabel: `Ngữ cảnh: vùng khoanh ở trang ${this.state.page}`,
      canhBao: "Model đang đọc VĂN BẢN trích từ trang, chưa đọc ảnh. Muốn chính xác hơn thì bôi đen đúng đoạn chữ.",
    });
  }

  xoaNet() {
    const cv = this.layCanvas();
    if (!cv) return;
    cv.getContext("2d").clearRect(0, 0, cv.width, cv.height);
    delete this.netVe[this.khoaTrang()];
    this._coNet = false;
  }

  // ------------------------------------------------------------ tiện ích khác
  toanManHinh() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }

  batPhimTat() {
    document.addEventListener("keydown", (e) => {
      const tag = document.activeElement?.tagName;
      const dangGo = tag === "INPUT" || tag === "TEXTAREA";

      // Esc xử lý TRƯỚC chốt "đang gõ": người dùng gõ ghi chú xong bấm Esc để
      // đóng là phản xạ tự nhiên, chặn ở đây thì ngăn kéo không đóng được.
      if (e.key === "Escape") {
        if (this.quizSession) { this.exitQuiz(); return; }
        if (this.state.noteOpen) {
          document.activeElement?.blur();
          this.setState({ noteOpen: false });
          return;
        }
      }
      if (dangGo) return;

      // Trong trận: phím 1-4 chọn đáp án.
      if (this.quizSession) {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 4 && this.quizSession.state === "QUESTION") {
          this.quizSession.selectOption(n - 1);
        }
        return;
      }
      if (this.state.view !== "reader") return;
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); this.goto(this.state.page - 1); }
      else if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); this.goto(this.state.page + 1); }
      else if (e.key.toLowerCase() === "n") this.toggleNote();
      else if (e.key.toLowerCase() === "f") this.toanManHinh();
    });
  }

  /** Bấm ra ngoài ngăn kéo thì đóng — lối thoát thứ ba, cạnh nút ✕ và phím Esc.
   *  Ngăn kéo che mất cột Tutor nên phải luôn có đường ra dễ tìm. */
  batDongNgoai() {
    document.addEventListener("mousedown", (e) => {
      if (!this.state.noteOpen) return;
      if (e.target.closest(".vl-drawer")) return;
      // Bỏ qua chính nút mở/đóng, nếu không nó đóng rồi mở lại ngay.
      if (e.target.closest('[data-action="toggleNote"]')) return;
      this.setState({ noteOpen: false });
    });
  }

  themXp(diem, nhan) {
    this.state.xp += diem;
    const el = this.root.querySelector("#vl-xp-val");
    if (el) el.textContent = this.state.xp;

    const pop = document.createElement("div");
    pop.className = "vl-xp-pop";
    pop.textContent = nhan;
    pop.style.left = "50%";
    pop.style.top = "88px";
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 1500);
  }

  /** Pháo giấy tự viết bằng DOM. Bản index_v2 nạp canvas-confetti từ CDN —
   *  demo hội trường mất wifi là mất luôn hiệu ứng, mà nguyên tắc số 1 của dự
   *  án là mọi thứ chạy được offline. */
  phaoGiay() {
    const mau = ["#2f6bff", "#34d399", "#e0a83a", "#e2504f", "#a78bfa"];
    const box = document.createElement("div");
    box.style.cssText = "position:fixed; inset:0; z-index:10000; pointer-events:none; overflow:hidden;";
    document.body.appendChild(box);
    for (let i = 0; i < 70; i++) {
      const p = document.createElement("i");
      const size = 6 + Math.random() * 7;
      p.style.cssText = `position:absolute; left:${Math.random() * 100}%; top:-14px;
        width:${size}px; height:${size * 0.6}px; background:${mau[i % mau.length]};
        opacity:${0.75 + Math.random() * 0.25}; border-radius:1px;`;
      p.animate([
        { transform: `translate3d(0,0,0) rotate(0deg)` },
        { transform: `translate3d(${(Math.random() - 0.5) * 220}px, ${window.innerHeight + 60}px, 0) rotate(${Math.random() * 900}deg)` },
      ], { duration: 1900 + Math.random() * 1100, easing: "cubic-bezier(.2,.6,.5,1)", fill: "forwards" });
      box.appendChild(p);
    }
    setTimeout(() => box.remove(), 3200);
  }

  // ------------------------------------------------------------ quiz
  startQuiz() {
    if (this.quizSession) this.quizSession.destroy();
    this.quizSession = new QuizBattleSession({
      userId: this.userId,
      userName: this.userName,
      materialId: this.state.materialId,
      page: this.state.page,
      doanBoiDen: this.selText || "",
      onUpdate: () => this.updateQuizUI(),
    });
    this.quizSession.batDau();
    this.updateQuizUI();
  }

  exitQuiz() {
    if (this.quizSession) {
      this.quizSession.destroy();
      this.quizSession = null;
    }
    this.updateQuizUI();
    this.render();
  }

  updateQuizUI() {
    let container = document.getElementById("quiz-overlay-root");

    if (!this.quizSession) {
      if (container) container.remove();
      return;
    }
    if (!container) {
      container = document.createElement("div");
      container.id = "quiz-overlay-root";
      document.body.appendChild(container);
    }

    const qs = this.quizSession;
    if (qs.state === "FINISHED" && !qs.doneRecorded) {
      qs.doneRecorded = true;
      this.ghiKetQuaQuiz(qs);
    }

    // Engine gọi onUpdate 5 lần/giây để đồng hồ chạy mượt. Dựng lại DOM ở nhịp
    // đó là nhấp nháy thấy rõ: đo được 27 lần vẽ lại trong MỘT pha REVEAL 6
    // giây. Bản trước chỉ miễn cho QUESTION và QUEUEING, nên COUNTDOWN, REVEAL
    // và PREPARING đều rơi xuống nhánh dựng lại.
    //
    // Luật giờ chỉ còn một câu: **chữ ký không đổi thì không đụng vào DOM**,
    // chỉ ghi đè đúng vài node đổi theo giây. Chữ ký phải chứa MỌI thứ làm đổi
    // bố cục — kể cả showExplanations, thiếu nó thì bấm "xem chữa bài" không có
    // phản ứng gì.
    const dau = [qs.state, qs.qIndex, qs.selectedOption, qs.showExplanations,
                 !!qs.traLoiCua(qs.doiThu()?.userId)].join("|");

    if (container.dataset.dau === dau) {
      this.capNhatDongHo(container, qs);
      return;
    }

    container.innerHTML = this.renderQuizOverlayHTML();
    container.dataset.dau = dau;
    this.bindQuizOverlayEvents(container);
  }

  /** Ghi đè đúng những node đổi theo từng giây. Không dựng lại gì. */
  capNhatDongHo(container, qs) {
    const dat = (sel, gt) => {
      const el = container.querySelector(sel);
      if (el && el.textContent !== String(gt)) el.textContent = gt;
    };

    if (qs.state === "PREPARING") {
      dat("#qz-prep-sec", qs.searchTimer);
      return;
    }

    if (qs.state === "QUEUEING") {
      const conLai = Math.ceil(qs.conLaiGhep ?? 0);
      dat("#qz-wait-sec", conLai);
      dat("#qz-wait-peers", qs.cungHang);
      const bar = container.querySelector("#qz-wait-bar");
      if (bar) bar.style.width = `${Math.max(0, Math.min(100, ((10 - conLai) / 10) * 100))}%`;
      return;
    }

    if (qs.state === "COUNTDOWN") {
      dat("#qz-countdown", Math.max(1, Math.ceil(qs.timer || 1)));
      return;
    }

    if (qs.state === "QUESTION") {
      const thap = qs.timer <= 5;
      const bar = container.querySelector("#qz-timer-bar");
      const txt = container.querySelector("#qz-timer-text");
      if (bar) {
        bar.style.width = Math.max(0, Math.min(100, (qs.timer / 20) * 100)) + "%";
        bar.classList.toggle("is-low", thap);
      }
      if (txt) {
        dat("#qz-timer-text", Math.ceil(qs.timer) + "s");
        txt.classList.toggle("is-low", thap);
      }
    }
    // REVEAL và FINISHED đứng yên — không có gì đổi theo giây, không chạm vào.
  }

  bindQuizOverlayEvents(container) {
    const actions = {
      exitQuiz: () => this.exitQuiz(),
      retryQuiz: () => this.startQuiz(),
      toggleQuizExplanations: () => this.quizSession?.toggleExplanations(),
    };
    container.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", () => actions[el.dataset.action]?.());
    });
    container.querySelectorAll("[data-quiz-opt]").forEach((el) => {
      el.addEventListener("click", () => {
        this.quizSession?.selectOption(parseInt(el.dataset.quizOpt, 10));
      });
    });
  }

  ghiKetQuaQuiz(qs) {
    const room = qs.room || {};
    const answers = room.answers || {};
    let dung = 0;
    const missed = (room.questions || []).slice(0, room.soCau || 5).flatMap((q, idx) => {
      const ans = answers[String(idx)]?.[this.userId];
      if (ans?.isCorrect) { dung += 1; return []; }
      return [{
        id: `wrong_${Date.now()}_${idx}`,
        materialId: room.materialId,
        page: room.page,
        question: q.question,
        correct: q.options[q.correct],
        selected: ans && ans.selectedOption >= 0 ? q.options[ans.selectedOption] : "(không kịp trả lời)",
        explanation: q.explanation || q.trich_dan || "",
        time: gio(),
      }];
    });

    this.setState((s) => ({
      quizDone: s.quizDone + 1,
      wrongQuizItems: [...s.wrongQuizItems, ...missed],
      wrongQuizPages: new Set([...s.wrongQuizPages, ...missed.map((i) => i.page)]),
    }));

    if (dung) this.themXp(dung * XP_QUIZ_DUNG, `+${dung * XP_QUIZ_DUNG} XP · ${dung}/${room.soCau || 5} câu đúng`);
    const toi = qs.toi(), doi = qs.doiThu();
    if (toi && doi && toi.score >= doi.score) this.phaoGiay();
  }

  // ------------------------------------------------------------ thống kê
  stats() {
    const s = this.state;
    const userQuestions = s.messages.filter((m) => m.isUser).length;
    const pagesSeen = s.pagesSeen instanceof Set ? s.pagesSeen.size : 0;
    const readPct = s.total ? Math.round((pagesSeen / s.total) * 100) : 0;
    const notes = Object.values(s.ghiChu).filter((v) => (v || "").trim()).length;
    return {
      userQuestions,
      pagesSeen,
      readPct,
      notes,
      highlights: s.highlights.length,
      reviewPages: s.wrongQuizPages instanceof Set ? s.wrongQuizPages.size : 0,
      quizDone: s.quizDone,
      xp: s.xp,
    };
  }

  // ------------------------------------------------------------ view chung
  renderNav() {
    const { s, t } = this.vals();
    const items = [
      ["dashboard", t.navDashboard, "home"],
      ["courses", t.navCourses, "library-big"],
      ["reader", t.navReader, "book-open"],
      ["notebook", t.navNotebook, "sticky-note"],
    ];
    return `
      <nav class="vl-top-nav" aria-label="VLearn">
        ${items.map(([view, label, iconName]) => `
          <button data-view="${esc(view)}" class="vl-nav-btn ${s.view === view ? "is-active" : ""}">
            ${icon(iconName, 16)}${esc(label)}
          </button>
        `).join("")}
      </nav>`;
  }

  renderCurrentView() {
    if (this.state.view === "dashboard") return this.renderDashboardView();
    if (this.state.view === "courses") return this.renderCoursesView();
    if (this.state.view === "notebook") return this.renderNotebookView();
    return "";
  }

  renderDashboardView() {
    const t = T[this.state.lang];
    const st = this.stats();
    return `
      <section id="view-dashboard" class="vl-app-view vl-scroll">
        <div class="vl-view-inner">
          <div class="vl-view-card" style="position:relative; overflow:hidden; padding:30px;">
            <div style="position:absolute; left:0; right:0; top:0; height:4px; background:var(--accent);"></div>
            <p class="vl-view-kicker">${esc(t.heroKicker)}</p>
            <h1 class="vl-view-title">${esc(t.welcomeBack)}, ${esc(this.userName)}!</h1>
            <p class="vl-view-copy" style="max-width:760px; margin:10px 0 0;">${esc(t.heroDesc)}</p>
          </div>

          <div class="vl-stat-grid">
            ${this.renderStatCard("message-circle", t.statTutor, st.userQuestions)}
            ${this.renderStatCard("check-circle", t.statQuizDone, st.quizDone)}
            ${this.renderStatCard("book-open", t.statReadPct, `${st.readPct}%`)}
          </div>

          <button data-view="courses" class="vl-view-card" style="margin-top:18px; width:100%; display:flex; align-items:center; justify-content:space-between; gap:16px; padding:22px; text-align:left; cursor:pointer;">
            <span style="display:flex; align-items:center; gap:14px;">
              <span class="vl-stat-icon">${icon("library-big", 22)}</span>
              <span>
                <span style="display:block; color:var(--text-bright); font-size:18px; font-weight:900;">${esc(t.ctaCourses)}</span>
                <span class="vl-view-copy" style="display:block; margin-top:3px;">${esc(t.ctaCoursesDesc)}</span>
              </span>
            </span>
            <span class="vl-primary-btn">${esc(t.enterCourseList)} ${icon("chevron-right", 16)}</span>
          </button>
        </div>
      </section>`;
  }

  renderStatCard(iconName, label, value) {
    return `
      <article class="vl-view-card vl-stat-card">
        <span class="vl-stat-icon">${icon(iconName, 22)}</span>
        <span>
          <span class="vl-stat-label">${esc(label)}</span>
          <span class="vl-stat-value" style="display:block;">${esc(value)}</span>
        </span>
      </article>`;
  }

  renderCoursesView() {
    const t = T[this.state.lang];
    const st = this.stats();
    return `
      <section id="view-courses" class="vl-app-view vl-scroll">
        <div class="vl-view-inner">
          <header style="display:flex; align-items:flex-start; justify-content:space-between; gap:18px; padding-bottom:18px; border-bottom:1px solid var(--line); margin-bottom:22px;">
            <div>
              <p class="vl-view-kicker">${esc(t.heroKicker)}</p>
              <h1 class="vl-view-title">${esc(t.myCoursesTitle)}</h1>
              <p class="vl-view-copy" style="margin:8px 0 0;">${esc(t.myCoursesDesc)}</p>
            </div>
            <span style="border:1px solid var(--note-bd); background:var(--accent-soft-bg); color:var(--note-fg); border-radius:999px; padding:7px 12px; font-size:12px; font-weight:800; white-space:nowrap;">${esc(t.enrolledClass)}</span>
          </header>

          <div class="vl-course-grid">
            <article class="vl-view-card" style="padding:22px;">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
                <span style="background:var(--accent-soft-bg); color:var(--accent); border:1px solid var(--note-bd); border-radius:7px; padding:5px 9px; font-size:11px; font-weight:900;">COMP2010</span>
                <span style="color:#10b981; border:1px solid rgba(16,185,129,.35); background:rgba(16,185,129,.1); border-radius:999px; padding:4px 8px; font-size:11px; font-weight:800;">${st.readPct}% ${esc(t.readDone)}</span>
              </div>
              <h2 style="margin:16px 0 6px; color:var(--text-bright); font-size:19px; line-height:1.25;">${esc(t.courseTitle)}</h2>
              <p class="vl-view-copy" style="margin:0;">${esc(t.courseDesc)}</p>
              <div style="margin-top:24px;">
                <div class="vl-progress-track"><div class="vl-progress-bar" style="width:${st.readPct}%;"></div></div>
                <div style="display:flex; gap:10px; margin-top:18px;">
                  <button data-view="notebook" class="vl-secondary-btn" style="flex:1;">${icon("sticky-note", 16)}${esc(t.btnNotebook)}</button>
                  <button data-view="reader" class="vl-primary-btn" style="flex:1;">${icon("book-open", 16)}${esc(t.btnStudySlide)}</button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>`;
  }

  renderNotebookView() {
    const t = T[this.state.lang];
    const st = this.stats();
    return `
      <section id="view-notebook" class="vl-app-view vl-scroll">
        <div class="vl-view-inner">
          <header style="display:flex; align-items:flex-start; justify-content:space-between; gap:18px; padding-bottom:18px; border-bottom:1px solid var(--line); margin-bottom:20px;">
            <div>
              <p class="vl-view-kicker">${esc(t.heroKicker)}</p>
              <h1 class="vl-view-title">${esc(t.notebookTitle)}</h1>
              <p class="vl-view-copy" style="margin:8px 0 0;">${esc(t.notebookDesc)}</p>
            </div>
            <div class="vl-notebook-tabs">
              <button data-notebook-tab="feed" class="vl-tab-btn ${this.state.notebookTab === "feed" ? "is-active" : ""}">${esc(t.tabNotes)}</button>
              <button data-notebook-tab="flashcard" class="vl-tab-btn ${this.state.notebookTab === "flashcard" ? "is-active" : ""}">${esc(t.tabFlashcard)}</button>
            </div>
          </header>

          <div style="display:grid; grid-template-columns:repeat(5, minmax(0, 1fr)); gap:12px; margin-bottom:20px;">
            ${this.renderMiniStat(t.statNotes, st.notes)}
            ${this.renderMiniStat(t.statHighlights, st.highlights)}
            ${this.renderMiniStat(t.statTutor, st.userQuestions)}
            ${this.renderMiniStat(t.statReviewPages, st.reviewPages)}
            ${this.renderMiniStat(t.statReadSignals, st.pagesSeen)}
          </div>

          ${this.state.notebookTab === "flashcard" ? this.renderFlashcards() : this.renderNotebookFeed()}
        </div>
      </section>`;
  }

  renderMiniStat(label, value) {
    return `
      <article class="vl-view-card" style="padding:16px;">
        <div class="vl-stat-label">${esc(label)}</div>
        <div style="margin-top:4px; color:var(--text-bright); font-size:25px; font-weight:900;">${esc(value)}</div>
      </article>`;
  }

  mucSoTay() {
    const t = T[this.state.lang];
    const ra = [];
    for (const [key, text] of Object.entries(this.state.ghiChu)) {
      if (!(text || "").trim()) continue;
      const [mat, trang] = key.split(":");
      ra.push({ id: `note_${key}`, kind: t.sourceNote, page: trang, materialId: mat, text, time: "" });
    }
    this.state.highlights.forEach((h) => {
      ra.push({ id: h.id, kind: t.statHighlights, page: h.page, materialId: h.materialId, text: h.text, time: h.time });
    });
    this.state.wrongQuizItems.forEach((w) => {
      ra.push({
        id: w.id, kind: t.sourceWrongQuiz, page: w.page, materialId: w.materialId,
        text: `${w.question}\n${t.correctAnswer}: ${w.correct}`, time: w.time,
      });
    });
    return ra;
  }

  renderNotebookFeed() {
    const t = T[this.state.lang];
    const entries = this.mucSoTay();
    if (!entries.length) return this.renderEmptyReview();
    return `
      <div class="vl-note-list">
        ${entries.map((item) => `
          <article class="vl-view-card vl-note-item">
            <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px;">
              <span class="vl-stat-label">${esc(item.kind)}</span>
              <span style="color:var(--muted); font-size:12px;">${esc(t.page)} ${esc(item.page)}${item.time ? ` · ${esc(item.time)}` : ""}</span>
            </div>
            <div style="color:var(--text); white-space:pre-wrap; line-height:1.55;">${esc(item.text)}</div>
          </article>
        `).join("")}
      </div>`;
  }

  renderEmptyReview() {
    const t = T[this.state.lang];
    return `
      <section class="vl-empty">
        <div style="color:var(--muted);">${icon("sticky-note", 40)}</div>
        <h2 style="margin:14px 0 6px; color:var(--text-bright); font-size:17px;">${esc(t.emptyReviewTitle)}</h2>
        <p class="vl-view-copy" style="max-width:620px; margin:0 auto;">${esc(t.emptyReviewDesc)}</p>
        <button data-view="reader" class="vl-primary-btn" style="margin-top:18px;">${icon("book-open", 16)}${esc(t.openMaterials)}</button>
      </section>`;
  }

  flashcardItems() {
    const t = T[this.state.lang];
    const ra = [];
    for (const [key, text] of Object.entries(this.state.ghiChu)) {
      if (!(text || "").trim()) continue;
      const [, trang] = key.split(":");
      ra.push({
        id: `card_note_${key}`, page: trang, source: t.sourceNote,
        front: text.slice(0, 120), back: text,
      });
    }
    this.state.wrongQuizItems.forEach((item) => {
      ra.push({
        id: `card_${item.id}`, page: item.page, source: t.sourceWrongQuiz,
        front: item.question,
        back: `${t.yourAnswer}: ${item.selected}\n${t.correctAnswer}: ${item.correct}${item.explanation ? `\n\n${item.explanation}` : ""}`,
      });
    });
    // Thẻ đã tự đánh dấu "thuộc" xuống cuối — ôn cái chưa thuộc trước.
    return ra.sort((a, b) => (this.state.srs[a.id] === "thuoc" ? 1 : 0)
                            - (this.state.srs[b.id] === "thuoc" ? 1 : 0));
  }

  /** Màn rỗng riêng cho tab Flashcard.
   *
   *  Thẻ không tự có: chúng SINH RA từ ghi chú và từ câu quiz trả lời sai. Dùng
   *  chung màn rỗng với tab Ghi chú thì người dùng chỉ đọc được "chưa có dữ
   *  liệu" và kết luận tính năng chưa làm — nên ở đây nói thẳng hai đường tạo thẻ.
   */
  renderFlashcardEmpty() {
    const t = T[this.state.lang];
    return `
      <section class="vl-empty">
        <div style="color:var(--muted);">${icon("rotate-3d", 40)}</div>
        <h2 style="margin:14px 0 6px; color:var(--text-bright); font-size:17px;">Chưa có thẻ ôn tập nào</h2>
        <p class="vl-view-copy" style="max-width:620px; margin:0 auto;">
          Thẻ được tạo tự động từ chính vết học của em — không phải nhập tay.
          Có hai đường:
        </p>
        <div class="vl-howto">
          <div class="vl-howto-step">
            <span class="vl-howto-num">1</span>
            <span class="vl-howto-text">
              Mở một trang slide, bấm <b>Ghi chú</b> trên thanh công cụ và viết vài dòng.
              Mỗi trang có ghi chú thành <b>một thẻ</b>: mặt trước là ghi chú, mặt sau là toàn văn.
            </span>
          </div>
          <div class="vl-howto-step">
            <span class="vl-howto-num">2</span>
            <span class="vl-howto-text">
              Bấm <b>Kiểm tra hiểu</b> và đấu một trận. Mỗi câu em <b>trả lời sai</b> thành một thẻ,
              mặt sau ghi đáp án đúng kèm đoạn trích nguyên văn từ slide.
            </span>
          </div>
        </div>
        <div style="display:flex; gap:10px; justify-content:center; margin-top:20px; flex-wrap:wrap;">
          <button data-view="reader" class="vl-primary-btn">${icon("book-open", 16)}${esc(t.openMaterials)}</button>
          <button data-notebook-tab="feed" class="vl-secondary-btn">${icon("sticky-note", 16)}${esc(t.tabNotes)}</button>
        </div>
      </section>`;
  }

  renderFlashcards() {
    const t = T[this.state.lang];
    const cards = this.flashcardItems();
    if (!cards.length) return this.renderFlashcardEmpty();
    const chuaThuoc = cards.filter((c) => this.state.srs[c.id] !== "thuoc").length;
    return `
      <div>
        <div class="vl-view-card" style="display:flex; align-items:center; justify-content:space-between; gap:14px; padding:16px; margin-bottom:20px;">
          <div>
            <h3 style="margin:0; color:var(--text-bright); font-size:15px;">${esc(t.flashcardTitle)}</h3>
            <p class="vl-view-copy" style="margin:4px 0 0;">${esc(t.flashcardDesc)}</p>
          </div>
          <span style="color:var(--text-mid); font-size:12px; font-weight:800;">${chuaThuoc}/${cards.length} ${esc(t.cardCount)}</span>
        </div>
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(300px, 1fr)); gap:18px; justify-items:center;">
          ${cards.map((card) => {
            const tt = this.state.srs[card.id];
            return `
            <div class="vl-flashcard-wrap" data-flashcard="${esc(card.id)}">
              <div class="vl-flashcard-inner">
                <div class="vl-flashcard-face vl-flashcard-front">
                  <div style="display:flex; justify-content:space-between; gap:12px; font-size:11px; font-weight:800; opacity:.82;">
                    <span>${esc(t.page)} ${esc(card.page)} · ${esc(card.source)}</span>
                    <span>${esc(t.clickFlip)}</span>
                  </div>
                  <div style="text-align:center; font-size:18px; line-height:1.45; font-weight:900;">${esc(card.front)}</div>
                  <div style="font-size:11px; opacity:.78;">COMP2010${tt === "thuoc" ? " · ✓" : ""}</div>
                </div>
                <div class="vl-flashcard-face vl-flashcard-back">
                  <div style="display:flex; justify-content:space-between; gap:12px; color:var(--note-fg); font-size:11px; font-weight:900;">
                    <span>${esc(card.source)}</span>
                    <span>${esc(t.cardAnswer)}</span>
                  </div>
                  <div style="white-space:pre-wrap; color:var(--text); font-size:13px; line-height:1.6; overflow:auto;">${esc(card.back)}</div>
                  ${tt
                    ? `<div class="vl-srs-note">${esc(tt === "thuoc" ? t.srsKnown : t.srsPending)}</div>`
                    : `<div class="vl-srs-row">
                         <button class="vl-srs-btn is-know" data-srs="thuoc" data-card="${esc(card.id)}">${esc(t.srsKnow)}</button>
                         <button class="vl-srs-btn is-again" data-srs="on_lai" data-card="${esc(card.id)}">${esc(t.srsAgain)}</button>
                       </div>`}
                </div>
              </div>
            </div>`;
          }).join("")}
        </div>
      </div>`;
  }

  vals() {
    const s = this.state;
    const t = T[s.lang];
    const sl = s.slide || {};
    const scale = (s.zoom / 140).toFixed(3);
    const toolStyle = (name) => s.tool === name
      ? { bg: "var(--tool-on-bg)", fg: "var(--tool-on-fg)" }
      : { bg: "transparent", fg: "var(--tool-off)" };

    const soGhiChu = Object.values(s.ghiChu).filter((v) => (v || "").trim()).length;
    return {
      s,
      t,
      sl,
      kind: sl.kind || "generic",
      langLabel: s.lang === "vi" ? "VI" : "EN",
      noteBadge: `${t.page} ${s.page} · ${soGhiChu} ${t.statNotes}`,
      zoomLabel: `${s.zoom}%`,
      slideScale: `scale(${scale})`,
      slideWrapMinHeight: `${Math.round(600 * s.zoom / 140)}px`,
      leftChevronRot: s.leftOpen ? "none" : "rotate(180deg)",
      leftBasis: s.leftOpen ? "344px" : "0px",
      rightBasis: s.rightOpen ? "456px" : "0px",
      slidePageBadge: `Trang slide: ${s.page}`,
      quotaLabel: `${s.quota} / ${s.quotaMax} ${t.cau}`,
      quotaPct: `${Math.round((s.quota / s.quotaMax) * 100)}%`,
      rd: toolStyle("read"),
      pn: toolStyle("pen"),
      er: toolStyle("eraser"),
      cr: toolStyle("crop"),
    };
  }

  renderLectures() {
    return (this.state.lectures || []).map((grp) => {
      const open = !this.state.collapsed[grp.day];
      const docs = open ? grp.docs.map((doc) => this.renderDoc(doc)).join("") : "";
      const badge = grp.badge
        ? `<span style="font-size:10px; font-weight:700; letter-spacing:.8px; color:#34d399; background:#0f2a1c; border:1px solid #17452e; padding:3px 8px; border-radius:6px;">${esc(grp.badge)}</span>`
        : "";
      return `
        <div style="width:312px;">
          <div style="display:flex; align-items:flex-start; justify-content:space-between; margin:14px 2px 12px;">
            <div>
              <div style="display:flex; align-items:center; gap:9px;">
                <span style="display:flex; color:var(--play);">${icon("circle-play", 19)}</span>
                <span style="font-size:16px; font-weight:700; color:var(--text-bright);">${esc(grp.day)}</span>
                ${badge}
              </div>
              <div style="font-family:ui-monospace, Menlo, monospace; font-size:10.5px; letter-spacing:1px; color:var(--mono-label); margin-top:7px; padding-left:28px;">${esc(grp.docs.length)} TÀI LIỆU · ${esc(grp.status)}</div>
            </div>
            <button data-group="${esc(grp.day)}" style="display:flex; color:var(--muted); cursor:pointer; margin-top:3px; background:transparent; border:none; padding:0;">${ico("chevron-down", 20, `transition:transform .18s; transform:${open ? "rotate(180deg)" : "none"}`)}</button>
          </div>
          <div style="display:flex; flex-direction:column; gap:10px;">${docs}</div>
        </div>`;
    }).join("");
  }

  renderDoc(doc) {
    const selected = doc.id === this.state.materialId;
    const bg = selected ? "var(--sel-bg)" : "var(--card-bg)";
    const border = selected ? "var(--sel-bd)" : "var(--card-bd)";
    const glow = selected ? "0 0 0 1px var(--sel-bd), 0 0 18px rgba(45,120,180,.25)" : "none";
    const checkVis = selected ? "visible" : "hidden";
    return `
      <button data-doc="${esc(doc.id)}" style="display:flex; align-items:center; gap:12px; padding:13px 14px; border-radius:12px; background:${bg}; border:1px solid ${border}; box-shadow:${glow}; cursor:pointer; text-align:left; width:100%;">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--play)" stroke-width="2" style="flex:0 0 auto; width:20px; height:20px;"><circle cx="12" cy="12" r="10"></circle><polygon points="10,8 16,12 10,16" fill="var(--play)" stroke="none"></polygon></svg>
        <div style="min-width:0; flex:1;">
          <div style="font-size:13.5px; font-weight:600; color:var(--doc-title); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${esc(doc.name)}</div>
          <div style="font-size:12px; color:var(--muted); margin-top:3px;">${esc(doc.pages)} ${esc(T[this.state.lang].trang)}</div>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex:0 0 auto; width:19px; height:19px; visibility:${checkVis};"><circle cx="12" cy="12" r="10"></circle><path d="M8 12.5l2.5 2.5 5-6"></path></svg>
      </button>`;
  }

  renderSlide() {
    const { sl, kind } = this.vals();
    if (kind === "image") return this.renderImageSlide(sl);
    if (kind === "chart") return this.renderChartSlide(sl);
    if (kind === "bullets") return this.renderBulletsSlide(sl);
    return this.renderGenericSlide(sl);
  }

  renderImageSlide(sl) {
    return `
      <div style="padding:0; background:#fff; display:flex; align-items:center; justify-content:center; min-height:200px;">
        <img src="${esc(sl.src || "")}" alt="${esc(sl.title || "")} — trang ${esc(sl.page)}"
             style="display:block; width:100%; height:auto;"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
        <div style="display:none; padding:40px; text-align:center; color:#666; font-size:14px; line-height:1.6;">
          Chưa có ảnh slide.<br>
          Chạy <code style="background:#eee; padding:2px 6px; border-radius:4px;">python codebase/ingest_slides.py</code> để tạo lại từ data pack.
        </div>
      </div>`;
  }

  renderChartSlide(sl) {
    return `
      <div style="padding:34px 40px 26px;">
        <div style="font-size:26px; font-weight:800; color:#1c2530; margin-bottom:10px;">${esc(sl.title || "")}</div>
        <div style="position:relative; height:420px; margin:6px 0 4px;">
          <div style="position:absolute; left:120px; top:12px; bottom:70px; width:1.5px; background:#222;"></div>
          <div style="position:absolute; left:114px; top:6px; width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-bottom:8px solid #222;"></div>
          <div style="position:absolute; left:120px; right:20px; bottom:70px; height:1.5px; background:#222;"></div>
          <div style="position:absolute; right:14px; bottom:66px; width:0;height:0;border-top:5px solid transparent;border-bottom:5px solid transparent;border-left:8px solid #222;"></div>
          <svg style="position:absolute; left:120px; top:12px; width:calc(100% - 140px); height:calc(100% - 82px); overflow:visible;" preserveAspectRatio="none" viewBox="0 0 100 100"><line x1="0" y1="100" x2="100" y2="0" stroke="#888" stroke-width="0.5" stroke-dasharray="2 2" vector-effect="non-scaling-stroke"></line></svg>
          <div style="position:absolute; left:47%; top:52%; transform:rotate(-27deg); font-style:italic; font-weight:700; font-size:15px; color:#555;">Calibrated trust</div>
          <div style="position:absolute; left:74px; top:44%; transform:rotate(-90deg); transform-origin:center; font-weight:700; font-size:14px; color:#2a2a2a; white-space:nowrap;">Trust in AI system</div>
          <div style="position:absolute; left:96px; top:6px; font-size:12px; color:#333;">High</div>
          <div style="position:absolute; left:96px; bottom:76px; font-size:12px; color:#333;">Low</div>
          <div style="position:absolute; left:130px; bottom:50px; font-size:12px; color:#333;">Low</div>
          <div style="position:absolute; right:24px; bottom:50px; font-size:12px; color:#333;">High</div>
          <div style="position:absolute; left:0; right:0; bottom:24px; text-align:center; font-weight:700; font-size:15px; color:#2a2a2a;">AI capability</div>
          <div style="position:absolute; left:170px; top:52px; width:230px; background:#e07b39; color:#fff; border-radius:3px; padding:9px 11px; font-size:11px; line-height:1.35; box-shadow:0 2px 6px rgba(0,0,0,.2);">
            <div style="font-weight:700; margin-bottom:5px;">Overtrust = user tín cao hơn năng lực thật của AI</div>
            <ul style="margin:0; padding-left:15px;"><li>Ví dụ AI chỉ nên gợi ý, nhưng UI làm user tưởng nó có thể tự quyết</li><li>Nguy hiểm vì user dễ giao việc quá mức, bỏ qua kiểm tra</li></ul>
          </div>
          <div style="position:absolute; right:36px; top:40px; width:180px; background:#34a853; color:#fff; border-radius:3px; padding:10px 12px; font-size:12px; font-weight:600; line-height:1.35; box-shadow:0 2px 6px rgba(0,0,0,.2);">Thiết kế AI nhằm hiệu chỉnh trust đúng mức</div>
          <div style="position:absolute; right:70px; top:200px; width:250px; background:#e07b39; color:#fff; border-radius:3px; padding:9px 11px; font-size:11px; line-height:1.35; box-shadow:0 2px 6px rgba(0,0,0,.2);">
            <div style="font-weight:700; margin-bottom:5px;">Distrust = user tín thấp hơn năng lực thật của AI</div>
            <ul style="margin:0; padding-left:15px;"><li>Ví dụ AI thực ra giúp tốt, nhưng user không dám dùng hoặc bỏ qua hoàn toàn</li><li>Hậu quả là underuse: có giá trị nhưng không được tận dụng</li></ul>
          </div>
        </div>
        <div style="font-size:13px; font-style:italic; color:#333; line-height:1.5; margin-top:6px;"><b>Figure 4-1.  Trust calibration.</b> Users can overtrust the AI when their trust exceeds the system's capabilities. They can distrust the system if they are not confident of the AI's performance</div>
        <div style="font-size:10.5px; color:#9a9a9a; margin-top:18px; letter-spacing:.3px;">Source: Designing Human-Centric AI Experiences Applied UX Design for Artificial Intelligence (Akshay Kore)</div>
      </div>`;
  }

  renderBulletsSlide(sl) {
    const highlight = sl.highlight
      ? `<div style="display:inline-block; background:#161616; color:#fff; padding:8px 14px; border-radius:4px; font-size:18px; font-style:italic; font-weight:600; margin-bottom:24px;">${esc(sl.highlight)}</div>`
      : "";
    const bullets = (sl.bullets || []).map((b) => `<li style="margin-bottom:12px;">${esc(b)}</li>`).join("");
    const source = sl.source
      ? `<div style="font-size:11px; color:#9a9a9a; margin-top:34px; letter-spacing:.3px;">Source: ${esc(sl.source)}</div>`
      : "";
    return `
      <div style="padding:48px 56px; min-height:520px;">
        <div style="font-size:30px; font-weight:800; color:#1c2530; margin-bottom:22px;">${esc(sl.title || "")}</div>
        ${highlight}
        <ul style="margin:0; padding-left:24px; font-size:18px; line-height:1.9; color:#242424;">${bullets}</ul>
        ${source}
      </div>`;
  }

  renderGenericSlide(sl) {
    return `
      <div style="padding:56px; min-height:520px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center;">
        <div style="font-size:30px; font-weight:800; color:#1c2530;">${esc(sl.title || "")}</div>
        <div style="font-family:ui-monospace, Menlo, monospace; font-size:13px; color:#9aa4b2; margin-top:12px;">${esc(sl.subtitle || "")}</div>
        <div style="width:64%; margin-top:40px; display:flex; flex-direction:column; gap:14px;">
          <div style="height:14px; border-radius:6px; background:#eef1f5;"></div>
          <div style="height:14px; border-radius:6px; background:#eef1f5; width:88%;"></div>
          <div style="height:14px; border-radius:6px; background:#eef1f5; width:94%;"></div>
          <div style="height:14px; border-radius:6px; background:#eef1f5; width:70%;"></div>
        </div>
      </div>`;
  }

  /** Khối văn bản dưới slide.
   *
   *  Vừa là chỗ bôi đen được trên slide ảnh (ảnh thì không bôi đen được chữ),
   *  vừa là bằng chứng minh bạch: học viên thấy ĐÚNG những gì AI đọc, nên khi
   *  Tutor trả lời sai họ biết ngay là do trang thiếu chữ hay do model. */
  renderTextLayer() {
    const t = T[this.state.lang];
    const key = this.khoaTrang();
    const raw = this.state.chuSlide[key];
    if (raw === undefined) {
      return `<div class="vl-textlayer"><div class="vl-textlayer-head"><span class="vl-textlayer-title">${esc(t.textLayer)}</span><span class="vl-textlayer-count">đang tải…</span></div></div>`;
    }

    const mo = this.state.chuMoRong;
    const coChu = raw.trim().length > 0;
    let body;
    if (!coChu) {
      body = `<p class="vl-textlayer-empty">${esc(t.textLayerEmpty)}</p>`;
    } else {
      // Highlight lưu trong state rồi bọc lại lúc render — bản index_v2 dùng
      // Range.surroundContents() nên mọi vệt bôi đen bay sạch ở lần vẽ lại kế.
      let html = esc(raw);
      this.state.highlights
        .filter((h) => h.materialId === this.state.materialId && String(h.page) === String(this.state.page))
        .forEach((h) => {
          const can = esc(h.text);
          if (can && html.includes(can)) {
            html = html.split(can).join(`<mark class="vlearn-text-highlight">${can}</mark>`);
          }
        });
      body = `<div id="vl-slide-text" class="vl-textlayer-body">${html}</div>
              <p class="vl-textlayer-hint">${esc(t.textLayerHint)}</p>`;
    }

    return `
      <div class="vl-textlayer">
        <div class="vl-textlayer-head">
          <span class="vl-textlayer-title">${icon("book-open", 14)} ${esc(t.textLayer)}</span>
          <span class="vl-textlayer-count">${coChu ? `${raw.trim().length} ký tự` : "0 ký tự"}</span>
          <button data-action="toggleText" class="vl-link-btn">${esc(mo ? t.hide : t.show)}</button>
        </div>
        ${mo ? body : ""}
      </div>`;
  }

  renderMessages() {
    return this.state.messages.map((m) => {
      const ctx = m.hasContext
        ? `<div style="font-family:ui-monospace, Menlo, monospace; font-size:11px; color:var(--ctx-label); margin-bottom:8px;">${esc(m.context)}</div>`
        : "";
      const canhBao = m.canhBao
        ? `<div class="qz-chip qz-chip--warn" style="margin-bottom:9px;">${esc(m.canhBao)}</div>`
        : "";
      const tree = m.tree ? `<div class="vl-tree">${esc(m.tree)}</div>` : "";
      const body = m.isUser
        ? `<div style="display:flex; justify-content:flex-end;"><div style="max-width:80%; background:var(--accent); color:#fff; border-radius:14px 14px 4px 14px; padding:12px 16px; font-size:14.5px; line-height:1.45; font-weight:500; white-space:pre-wrap;">${esc(m.text)}</div></div>`
        : `<div style="background:var(--soft-bg); border:1px solid var(--card-bd); border-radius:14px; padding:14px 16px; font-size:14.5px; line-height:1.55; color:var(--text); white-space:pre-wrap;">${canhBao}${esc(m.text)}${tree}</div>`;
      return `<div>${ctx}${body}</div>`;
    }).join("");
  }

  renderSending() {
    if (!this.state.sending) return "";
    const giay = this.choT0 ? Math.round((Date.now() - this.choT0) / 1000) : 0;
    const ghiChu = this.ghiChuCho
      ? `<div style="font-size:12px; color:var(--muted); line-height:1.55;">${esc(this.ghiChuCho)}</div>`
      : "";
    return `
      <div style="background:var(--soft-bg); border:1px solid var(--card-bd); border-radius:14px; padding:14px 16px; display:flex; flex-direction:column; gap:9px;">
        <div style="display:flex; gap:10px; align-items:center;">
          <span style="display:flex; gap:5px;">
            <span style="width:7px;height:7px;border-radius:50%;background:var(--note-fg);animation:vlblink 1.2s infinite;"></span>
            <span style="width:7px;height:7px;border-radius:50%;background:var(--note-fg);animation:vlblink 1.2s infinite .2s;"></span>
            <span style="width:7px;height:7px;border-radius:50%;background:var(--note-fg);animation:vlblink 1.2s infinite .4s;"></span>
          </span>
          <span style="font-family:ui-monospace, Menlo, monospace; font-size:12.5px; color:var(--text-mid);"><span id="vl-cho-sec">${giay}</span>s</span>
        </div>
        ${ghiChu}
      </div>`;
  }

  // ------------------------------------------------------------ overlay quiz
  renderQuizOverlayHTML() {
    if (!this.quizSession) return "";
    const qs = this.quizSession;
    let body = "";

    if (qs.state === "PREPARING") body = this.qzSoanDe(qs);
    else if (qs.state === "REFUSED") body = this.qzTuChoi(qs);
    else if (qs.state === "ERROR") body = this.qzLoi(qs);
    else if (qs.state === "QUEUEING") body = this.qzTimDoiThu(qs);
    else if (qs.state === "COUNTDOWN") body = this.qzDemNguoc(qs);
    else if (qs.state === "QUESTION" || qs.state === "REVEAL") body = this.qzCauHoi(qs);
    else if (qs.state === "FINISHED") body = this.qzKetQua(qs);

    return `<div class="quiz-overlay">${body}</div>`;
  }

  qzSoanDe(qs) {
    return `
      <div class="qz-panel">
        <div class="qz-spinner"></div>
        <h2 class="qz-title">Đang soạn câu hỏi từ nội dung trang ${this.state.page}</h2>
        <p class="qz-sub">
          AI đọc văn bản trích từ slide rồi tự ra đề, nên lần đầu mỗi trang mất
          khoảng 15–40 giây. Các lần sau lấy lại tức thì từ cache.
        </p>
        <div class="qz-meta">
          <span class="qz-chip"><span id="qz-prep-sec">${qs.searchTimer}</span>s</span>
          <span class="qz-chip qz-chip--mut">${this.state.activeSameSlide} người đang mở trang này</span>
        </div>
        <div class="qz-actions"><button data-action="exitQuiz" class="qz-btn-ghost">Huỷ</button></div>
      </div>`;
  }

  qzTuChoi(qs) {
    const nhan = {
      thieu_can_cu: "Thiếu căn cứ trong slide",
      hoi_lai: "Cần hỏi lại cho rõ",
      tu_choi: "Từ chối yêu cầu",
    }[qs.hanhDong] || "Không ra đề";
    return `
      <div class="qz-panel">
        <span class="qz-refuse-badge">${esc(nhan)}</span>
        <h2 class="qz-title">AI không ra đề cho trang này</h2>
        <p class="qz-sub">
          Đây là hành vi đúng, không phải lỗi: bộ ra đề bị ràng buộc chỉ được dùng
          nội dung thực có trong slide. Không đủ căn cứ thì nó phải nói ra thay vì bịa câu hỏi.
        </p>
        <div class="qz-quote">${esc(qs.thongBao)}</div>
        <div class="qz-actions">
          <button data-action="exitQuiz" class="qz-btn">Về bài học</button>
        </div>
      </div>`;
  }

  qzLoi(qs) {
    return `
      <div class="qz-panel">
        <span class="qz-refuse-badge">Lỗi kết nối</span>
        <h2 class="qz-title">Không gọi được server</h2>
        <p class="qz-sub">${esc(qs.thongBao)}</p>
        <div class="qz-actions">
          <button data-action="retryQuiz" class="qz-btn">Thử lại</button>
          <button data-action="exitQuiz" class="qz-btn-ghost">Đóng</button>
        </div>
      </div>`;
  }

  qzTimDoiThu(qs) {
    const conLai = Math.ceil(qs.conLaiGhep ?? 10);
    const pct = Math.max(0, Math.min(100, ((10 - conLai) / 10) * 100));
    return `
      <div class="qz-panel">
        <div class="qz-radar"><span class="qz-radar-core">VS</span></div>
        <h2 class="qz-title">Đang tìm người cùng học trang ${this.state.page}</h2>
        <p class="qz-sub">
          Chỉ ghép với người đang mở <b>đúng tài liệu này, đúng trang này</b> và
          cũng vừa bấm ghép trận. Không có ai trong <span id="qz-wait-sec">${conLai}</span> giây
          nữa thì hệ thống ghép bot, và trận sẽ ghi rõ là đấu với bot.
        </p>
        <div class="qz-wait-track"><div id="qz-wait-bar" class="qz-wait-bar" style="width:${pct}%"></div></div>
        <div class="qz-meta">
          <span class="qz-chip qz-chip--mut">${this.state.activeSameSlide} người đang mở trang này</span>
          <span class="qz-chip"><span id="qz-wait-peers">${qs.cungHang}</span> người đang xếp hàng</span>
          <span class="qz-chip ${qs.nguonDe === "ai" ? "qz-chip--ok" : "qz-chip--warn"}">
            Đề: ${qs.nguonDe === "ai" ? "AI sinh từ slide" : "bộ dự phòng offline"}
          </span>
        </div>
        <div class="qz-note">
          Đang mở trang này ≠ muốn đấu. Vé xếp hàng chỉ sinh ra khi bấm nút, và tự
          huỷ sau 12 giây nếu bạn đóng tab — nên không ai bị ghép với một người đã bỏ đi.
        </div>
        <div class="qz-actions"><button data-action="exitQuiz" class="qz-btn-ghost">Huỷ</button></div>
      </div>`;
  }

  qzDemNguoc(qs) {
    const toi = qs.toi(), doi = qs.doiThu();
    const bot = doi?.isBot;
    return `
      <div class="qz-panel">
        <span class="qz-chip ${bot ? "qz-chip--warn" : "qz-chip--ok"}">
          ${bot ? "Ghép với bot — không tìm được người thật" : "Đã ghép với học viên thật"}
        </span>
        <div class="qz-vs">
          <div class="qz-vs-side">
            <div class="qz-avatar qz-avatar--me">BẠN</div>
            <div class="qz-vs-name">${esc(toi?.userName || "")}</div>
            <div class="qz-vs-tag">Trang ${this.state.page}</div>
          </div>
          <div class="qz-vs-mark">VS</div>
          <div class="qz-vs-side">
            <div class="qz-avatar ${bot ? "qz-avatar--bot" : "qz-avatar--opp"}">${bot ? "BOT" : "HV"}</div>
            <div class="qz-vs-name">${esc(doi?.userName || "")}</div>
            <div class="qz-vs-tag">${bot ? "Bot học viên" : "Học viên thật"}</div>
          </div>
        </div>
        <div id="qz-countdown" class="qz-countdown">${Math.max(1, Math.ceil(qs.timer || 1))}</div>
        <p class="qz-sub">${qs.soCau} câu · 20 giây mỗi câu · trả lời nhanh được thêm điểm tốc độ</p>
      </div>`;
  }

  qzCauHoi(qs) {
    const q = qs.cauHienTai();
    if (!q) return "";
    const reveal = qs.state === "REVEAL";
    const toi = qs.toi(), doi = qs.doiThu();
    const traLoiToi = qs.traLoiCua(toi.userId);
    const traLoiDoi = qs.traLoiCua(doi.userId);
    const daChon = qs.selectedOption !== null;
    const pct = Math.max(0, Math.min(100, (qs.timer / 20) * 100));
    const thap = qs.timer <= 5;

    const options = q.options.map((text, idx) => {
      const kc = OPTION_COLORS[idx] || OPTION_COLORS[0];
      const cls = ["qz-opt"];
      let mark = "";
      if (qs.selectedOption === idx) cls.push("is-picked");
      if (reveal) {
        cls.push("is-locked");
        if (idx === q.correct) { cls.push("is-correct"); mark = "✓"; }
        else if (qs.selectedOption === idx) { cls.push("is-wrong"); mark = "✗"; }
        else cls.push("is-dim");
      } else if (daChon) {
        cls.push("is-locked");
        if (qs.selectedOption !== idx) cls.push("is-dim");
      }
      return `
        <button data-quiz-opt="${idx}" class="${cls.join(" ")}" style="background:${kc.bg};">
          <span class="qz-opt-key">${kc.icon}</span>
          <span class="qz-opt-text">${esc(text)}</span>
          ${mark ? `<span class="qz-opt-mark">${mark}</span>` : ""}
        </button>`;
    }).join("");

    const trichDan = q.trich_dan || q.explanation || "";
    const cite = reveal && trichDan
      ? `<div class="qz-cite">
           <span class="qz-cite-label">${q.nguon === "ai" ? "Trích nguyên văn từ slide" : "Giải thích"}</span>
           ${esc(trichDan)}
         </div>`
      : "";

    const trangThaiDoi = traLoiDoi
      ? `<span class="qz-dot is-live"></span> ${esc(doi.userName)} đã trả lời`
      : `<span class="qz-dot"></span> Đang chờ ${esc(doi.userName)}…`;

    return `
      <div class="qz-stage">
        <div class="qz-bar">
          <div class="qz-bar-left">
            <!-- Lối thoát phải nhìn thấy được. Overlay phủ kín màn hình, nếu chỉ
                 thoát bằng Esc thì người không biết phím tắt sẽ mắc kẹt cả trận. -->
            <button data-action="exitQuiz" class="qz-exit" title="Thoát trận (Esc)">✕</button>
            <span class="qz-round">CÂU ${qs.qIndex + 1}/${qs.soCau} · TRANG ${this.state.page}</span>
            <span class="qz-chip ${qs.room?.matchType === "human" ? "qz-chip--ok" : "qz-chip--mut"}">
              ${qs.room?.matchType === "human" ? "Đấu người thật" : "Đấu bot"}
            </span>
            <span class="qz-chip ${q.nguon === "ai" ? "qz-chip--ok" : "qz-chip--warn"}">
              ${q.nguon === "ai" ? "Đề do AI sinh từ slide" : "Đề dự phòng offline"}
            </span>
          </div>
          <div class="qz-scores">
            <div class="qz-score qz-score--me">
              <span class="qz-score-name">${esc(toi.userName)}</span>
              <span class="qz-score-val">${toi.score}</span>
              ${toi.streak > 1 ? `<span class="qz-streak">×${toi.streak}</span>` : ""}
            </div>
            <div class="qz-score">
              <span class="qz-score-name">${esc(doi.userName)}</span>
              <span class="qz-score-val">${doi.score}</span>
              ${doi.streak > 1 ? `<span class="qz-streak">×${doi.streak}</span>` : ""}
            </div>
          </div>
        </div>

        <div class="qz-timer">
          <div class="qz-timer-track">
            <div id="qz-timer-bar" class="qz-timer-bar ${thap ? "is-low" : ""}" style="width:${pct}%"></div>
          </div>
          <span id="qz-timer-text" class="qz-timer-text ${thap ? "is-low" : ""}">${Math.ceil(qs.timer)}s</span>
        </div>

        <div class="qz-question">${esc(q.question)}</div>
        <div class="qz-options">${options}</div>

        <div class="qz-foot">
          <span class="qz-opp-state">${trangThaiDoi}</span>
          ${reveal && traLoiToi
            ? `<span class="qz-chip ${traLoiToi.isCorrect ? "qz-chip--ok" : "qz-chip--warn"}">
                 ${traLoiToi.isCorrect ? `+${traLoiToi.points} điểm` : "Chưa đúng"}
               </span>`
            : `<span class="qz-chip qz-chip--mut">Phím 1–4 để chọn nhanh</span>`}
        </div>
        ${cite}
      </div>`;
  }

  qzKetQua(qs) {
    const toi = qs.toi(), doi = qs.doiThu();
    const thang = toi.score >= doi.score;
    const nhat = thang ? toi : doi;
    const nhi = thang ? doi : toi;
    const room = qs.room || {};
    const answers = room.answers || {};

    const review = (room.questions || []).slice(0, room.soCau || 5).map((q, idx) => {
      const a = answers[String(idx)]?.[this.userId];
      const dung = a?.isCorrect;
      const chon = a && a.selectedOption >= 0 ? q.options[a.selectedOption] : "(không kịp trả lời)";
      return `
        <div class="qz-review-item">
          <div class="qz-review-q">Câu ${idx + 1}. ${esc(q.question)}</div>
          <div class="qz-review-a">
            ${dung ? `<b>Bạn trả lời đúng:</b> ${esc(q.options[q.correct])}`
                   : `<i>Bạn chọn:</i> ${esc(chon)}<br><b>Đáp án đúng:</b> ${esc(q.options[q.correct])}`}
            ${q.trich_dan || q.explanation
              ? `<br><span style="color:var(--ctx-label)">${q.nguon === "ai" ? "Trích từ slide" : "Giải thích"}:</span> ${esc(q.trich_dan || q.explanation)}`
              : ""}
          </div>
        </div>`;
    }).join("");

    return `
      <div class="qz-panel" style="max-width:680px;">
        <h2 class="qz-title">${thang ? "Bạn thắng trận này" : "Chưa thắng — nhưng đã biết mình hổng chỗ nào"}</h2>
        <p class="qz-sub">
          Trang ${room.page} · ${room.matchType === "human" ? "đấu với học viên thật" : "đấu với bot"} ·
          ${room.soCau || 5} câu
        </p>

        <div class="qz-podium">
          <div class="qz-podium-card">
            <div style="font-size:26px;">🥈</div>
            <div class="qz-podium-rank">Hạng 2</div>
            <div class="qz-podium-name">${esc(nhi.userName)}</div>
            <div class="qz-podium-score">${nhi.score}</div>
          </div>
          <div class="qz-podium-card is-first">
            <div style="font-size:34px;">🏆</div>
            <div class="qz-podium-rank">Quán quân</div>
            <div class="qz-podium-name">${esc(nhat.userName)}</div>
            <div class="qz-podium-score">${nhat.score}</div>
          </div>
        </div>

        <div class="qz-actions">
          <button data-action="toggleQuizExplanations" class="qz-btn-ghost">
            ${qs.showExplanations ? "Ẩn phần chữa bài" : "Xem chữa bài kèm trích dẫn"}
          </button>
        </div>

        ${qs.showExplanations ? `<div class="qz-review vl-scroll">${review}</div>` : ""}

        <div class="qz-actions">
          <button data-action="retryQuiz" class="qz-btn">Đấu lại trang này</button>
          <button data-action="exitQuiz" class="qz-btn-ghost">Về bài học</button>
        </div>
      </div>`;
  }

  // ------------------------------------------------------------ render chính
  render() {
    // Ghi lại Ô NHẬP NÀO đang giữ focus (chat #vl-input hay ghi chú
    // #vl-note-input) để trả lại sau khi innerHTML thay mới toàn bộ DOM.
    // Heartbeat presence có thể render() giữa lúc đang gõ — trước đây chỉ trả
    // focus cho ô chat, nên đang gõ ghi chú dở thì bị đá ra ngoài textarea.
    const focusId = ["vl-input", "vl-note-input"].find((id) => {
      const el = this.root.querySelector("#" + id);
      return el && document.activeElement === el;
    }) || null;
    const prevFocusEl = focusId ? this.root.querySelector("#" + focusId) : null;
    const caret = prevFocusEl ? prevFocusEl.selectionStart : null;
    const caretEnd = prevFocusEl ? prevFocusEl.selectionEnd : null;
    this.luuNetVe();

    const v = this.vals();
    const { s, t, rd, pn, er, cr } = v;
    const ghiChuTrang = s.ghiChu[this.khoaTrang()] || "";
    const goiY = s.goiY.length ? s.goiY : this.sinhGoiY();

    this.root.innerHTML = `
      <div id="vlroot" data-theme="${esc(s.theme)}" style="display:flex; flex-direction:column; height:100vh; width:100vw; background:var(--app-bg); color:var(--text); overflow:hidden; font-size:14px;">
        <header style="display:flex; align-items:center; justify-content:space-between; height:64px; flex:0 0 64px; padding:0 20px; background:var(--panel-bg); border-bottom:1px solid var(--line);">
          <div style="display:flex; align-items:center; gap:14px;">
            <!-- Logo thật của trường. Đặt trên nền trắng cố định: dấu V màu
                 navy #134D8C nằm trên nền tối --panel-bg #0a0f1b thì gần như
                 không nhìn ra. Chữ "Learn" đổi màu theo theme, chữ "V" giữ đỏ
                 thương hiệu vì đỏ đọc được trên cả hai nền. -->
            <button data-view="dashboard" class="vl-brand" title="Về trang chủ">
              <span class="vl-brand-mark"><img src="./logo-vlearn.png" alt="VLearn" width="24" height="24"></span>
              <span class="vl-brand-word"><b>V</b>Learn</span>
            </button>
            <div style="width:1px; height:30px; background:var(--btn-bd); margin:0 6px;"></div>
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span style="font-size:17px; font-weight:700; color:var(--text-bright);">${esc(s.materialName)}</span>
              <span style="font-family:ui-monospace, Menlo, monospace; font-size:11.5px; color:var(--mono-sub); letter-spacing:.2px;">COMP2010 · ${esc(s.materialId)}</span>
            </div>
          </div>

          ${this.renderNav()}

          <div style="display:flex; align-items:center; gap:12px;">
            <div class="vl-xp">
              <span><b id="vl-xp-val">${s.xp}</b> XP</span>
              <span class="vl-xp-sep">|</span>
              <span>${this.stats().quizDone} trận</span>
            </div>
            <button data-action="toggleLang" style="display:flex; align-items:center; justify-content:center; width:44px; height:38px; border-radius:10px; background:var(--btn-bg); border:1px solid var(--btn-bd); color:var(--text-mid); font-weight:700; font-size:13px; cursor:pointer;">${esc(v.langLabel)}</button>
            <button data-action="toggleTheme" style="display:flex; align-items:center; justify-content:center; width:40px; height:38px; border-radius:10px; background:var(--btn-bg); border:1px solid var(--btn-bd); color:var(--text-mid); cursor:pointer;">${icon("sun-moon", 19)}</button>
            <button style="display:flex; align-items:center; gap:8px; height:38px; padding:0 16px; border-radius:10px; background:var(--btn-bg); border:1px solid var(--btn-bd); color:var(--text); font-weight:600; font-size:13.5px; cursor:pointer;">${icon("user-round", 17)}${esc(this.userName)}</button>
          </div>
        </header>

        ${s.view !== "reader" ? this.renderCurrentView() : `
        <div style="display:flex; flex:1; min-height:0;">
          <aside class="vl-scroll" style="flex:0 0 ${v.leftBasis}; width:${v.leftBasis}; background:var(--side-bg); border-right:1px solid var(--line); overflow-y:auto; overflow-x:hidden; padding:14px 16px 40px; transition:flex-basis .18s, width .18s;">
            <div style="display:flex; align-items:center; gap:12px; width:312px; padding:4px 4px 16px; margin-bottom:6px; border-bottom:1px solid var(--line);">
              <span style="display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:11px; background:var(--accent-soft-bg); color:var(--accent);">${icon("library-big", 20)}</span>
              <div>
                <div style="font-size:16px; font-weight:700; color:var(--text-bright);">Học liệu môn học</div>
                <div style="font-size:12px; color:var(--mono-sub); margin-top:3px;">Chương, slide và tài liệu đã upload</div>
              </div>
            </div>
            ${this.renderLectures()}
          </aside>

          <main style="position:relative; flex:1; min-width:0; display:flex; flex-direction:column; background:var(--app-bg);">
            <div style="display:flex; align-items:center; gap:12px; padding:14px 22px 10px; flex-wrap:wrap;">
              <div style="display:flex; align-items:center; gap:2px; background:var(--card-bg); border:1px solid var(--card-bd); border-radius:11px; padding:4px;">
                <button data-action="setRead" style="display:flex; align-items:center; gap:7px; height:34px; padding:0 13px; border-radius:8px; background:${rd.bg}; border:none; color:${rd.fg}; font-weight:600; font-size:13px; cursor:pointer;">${icon("mouse-pointer-2", 16)}${esc(t.read)}</button>
                <button data-action="setPen" style="display:flex; align-items:center; gap:7px; height:34px; padding:0 13px; border-radius:8px; background:${pn.bg}; border:none; color:${pn.fg}; font-weight:600; font-size:13px; cursor:pointer;">${icon("pencil", 16)}${esc(t.pen)}</button>
                <button data-action="setEraser" style="display:flex; align-items:center; gap:7px; height:34px; padding:0 13px; border-radius:8px; background:${er.bg}; border:none; color:${er.fg}; font-weight:600; font-size:13px; cursor:pointer;">${icon("trash-2", 15)}${esc(t.eraser)}</button>
                <button data-action="setCrop" title="Khoanh một vùng trên slide rồi hỏi Tutor về vùng đó" style="display:flex; align-items:center; gap:7px; height:34px; padding:0 13px; border-radius:8px; background:${cr.bg}; border:none; color:${cr.fg}; font-weight:600; font-size:13px; cursor:pointer;">${icon("highlighter", 16)}${esc(t.crop)}</button>
                <button data-action="clearInk" style="height:34px; padding:0 11px; border-radius:8px; background:transparent; border:none; color:var(--muted); font-weight:600; font-size:12.5px; cursor:pointer;">${esc(t.clearInk)}</button>
              </div>

              <!-- Lối vào DUY NHẤT của tính năng kiểm tra hiểu: cạnh công cụ đọc,
                   đúng lúc học viên vừa đọc xong slide. -->
              <button data-action="startQuiz" title="Sinh câu hỏi kiểm tra hiểu từ nội dung trang ${s.page}"
                style="display:flex; align-items:center; gap:8px; height:36px; padding:0 16px; border-radius:11px; background:var(--accent-soft-bg); border:1px solid var(--note-bd); color:var(--note-fg); font-weight:700; font-size:13px; cursor:pointer;">
                ${icon("sparkles", 16)} Kiểm tra hiểu
              </button>

              <div style="display:flex; align-items:center; gap:2px; background:var(--card-bg); border:1px solid var(--card-bd); border-radius:11px; padding:4px;">
                <button data-action="teachDeck" title="Gửi văn bản trích từ toàn bộ file cho Tutor giảng lại theo mạch bài" style="display:flex; align-items:center; gap:7px; height:34px; padding:0 13px; border-radius:8px; background:transparent; border:none; color:var(--tool-off); font-weight:600; font-size:13px; cursor:pointer;">${icon("book-open", 15)}${esc(t.teachDeck)}</button>
                <button data-action="outline" title="Dàn ý cả file, trích thẳng từ PDF" style="display:flex; align-items:center; gap:7px; height:34px; padding:0 13px; border-radius:8px; background:transparent; border:none; color:var(--tool-off); font-weight:600; font-size:13px; cursor:pointer;">${icon("library-big", 15)}${esc(t.mindmap)}</button>
              </div>

              <button data-action="toggleNote" style="display:flex; align-items:center; gap:8px; height:36px; padding:0 14px; border-radius:10px; background:var(--accent-soft-bg); border:1px solid var(--note-bd); color:var(--note-fg); font-weight:600; font-size:13px; cursor:pointer;">
                ${icon("sticky-note", 15)}${esc(v.noteBadge)}
                <span id="vl-note-dot" class="vl-dot-flag" style="visibility:${ghiChuTrang.trim() ? "visible" : "hidden"}"></span>
              </button>

              <button data-action="fullscreen" style="display:flex; align-items:center; gap:7px; height:36px; padding:0 13px; border-radius:10px; background:var(--btn-bg); border:1px solid var(--btn-bd); color:var(--text-mid); font-weight:600; font-size:13px; cursor:pointer;">${esc(t.fullscreen)}</button>

              <div style="display:flex; align-items:center; gap:2px; background:var(--card-bg); border:1px solid var(--card-bd); border-radius:10px; padding:4px 6px;">
                <button data-action="zoomOut" style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:7px; background:transparent; border:none; color:var(--tool-off); cursor:pointer;">${icon("minus", 16)}</button>
                <span style="min-width:44px; text-align:center; font-size:13px; font-weight:600; color:var(--text-mid);">${esc(v.zoomLabel)}</span>
                <button data-action="zoomIn" style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:7px; background:transparent; border:none; color:var(--tool-off); cursor:pointer;">${icon("plus", 16)}</button>
              </div>
            </div>

            <div class="vl-scroll" style="flex:1; min-height:0; overflow:auto; padding:6px 40px 24px;">
              <div style="font-size:15px; color:var(--page-label); margin:0 0 12px 6px;">${esc(t.page)} ${esc(s.page)} / ${esc(s.total)}</div>
              <div style="display:flex; justify-content:center; min-height:${v.slideWrapMinHeight};">
                <div class="vl-slide-stage" style="width:820px; transform:${v.slideScale}; transform-origin:top center; background:#ffffff; border-radius:22px; box-shadow:0 10px 40px rgba(0,0,0,.18); color:#1a1a1a; overflow:hidden;">
                  ${this.renderSlide()}
                  <canvas id="vl-canvas" class="vl-draw-canvas ${s.tool !== "read" ? "is-on" : ""} ${s.tool === "eraser" ? "is-eraser" : ""}"></canvas>
                  <div class="vl-watermark">VINUNI.EDU.VN · COMP2010 · TRANG ${esc(s.page)}</div>
                </div>
              </div>
              <div style="max-width:820px; margin:18px auto 0;">${this.renderTextLayer()}</div>
            </div>

            <button data-action="toggleLeft" style="position:absolute; left:0; top:50%; transform:translateY(-50%); display:flex; align-items:center; justify-content:center; width:34px; height:70px; border-radius:0 14px 14px 0; background:var(--card-bg); border:1px solid var(--card-bd); border-left:none; color:var(--icon); cursor:pointer;">${ico("chevron-left", 18, `transition:transform .18s; transform:${v.leftChevronRot}`)}</button>
            <button data-action="toggleRight" title="Mở/đóng VLearn Tutor" style="position:absolute; right:0; top:50%; transform:translateY(-50%); display:flex; align-items:center; justify-content:center; width:34px; height:70px; border-radius:14px 0 0 14px; background:var(--card-bg); border:1px solid var(--card-bd); border-right:none; color:var(--icon); cursor:pointer;">${ico("bot", 18, "color:var(--note-fg);")}</button>

            <div style="flex:0 0 auto; display:flex; justify-content:center; padding:14px;">
              <div style="display:flex; align-items:center; gap:14px; background:var(--card-bg); border:1px solid var(--card-bd); border-radius:12px; padding:8px 14px;">
                <button data-action="prevPage" style="display:flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:9px; background:var(--pager-bg); border:1px solid var(--btn-bd); color:var(--tool-off); cursor:pointer;">${icon("chevron-left", 18)}</button>
                <span style="font-size:14px; color:var(--text-mid);">${esc(t.page)} <b style="color:var(--text-bright);">${esc(s.page)}</b> <span style="color:var(--muted);">/ ${esc(s.total)}</span></span>
                <button data-action="nextPage" style="display:flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:9px; background:var(--pager-bg); border:1px solid var(--btn-bd); color:var(--tool-off); cursor:pointer;">${icon("chevron-right", 18)}</button>
                <div style="width:1px; height:24px; background:var(--btn-bd); margin:0 2px;"></div>
                <span style="font-size:12px; color:var(--muted);">← → chuyển trang · N ghi chú · F toàn màn hình</span>
              </div>
            </div>

            <aside class="vl-drawer ${s.noteOpen ? "is-open" : ""}">
              <div class="vl-drawer-head">
                <span class="vl-drawer-title">${esc(t.noteFor)} · ${esc(t.page)} ${esc(s.page)}</span>
                <!-- Vùng bấm 30x30. Trước đây là .vl-link-btn với padding:0 nên
                     dấu ✕ chỉ chiếm 9x15 px — đo được 2/9 điểm quanh tâm mới
                     chạm trúng, nên gần như không đóng được bằng chuột. -->
                <button data-action="toggleNote" class="vl-drawer-close" title="Đóng (Esc)" aria-label="Đóng ghi chú">✕</button>
              </div>
              <div class="vl-drawer-body">
                <textarea id="vl-note-input" class="vl-note-input" placeholder="${esc(t.notePlaceholder)}">${esc(ghiChuTrang)}</textarea>
                <div class="vl-drawer-foot">
                  <span id="vl-note-saved" class="vl-saved-badge">✓ ${esc(t.noteSaved)}</span>
                  <button data-action="clearNote" class="vl-link-btn">${esc(t.noteClear)}</button>
                </div>
              </div>
            </aside>
          </main>

          <aside style="flex:0 0 ${v.rightBasis}; width:${v.rightBasis}; background:var(--side-bg); border-left:1px solid var(--line); display:flex; flex-direction:column; min-height:0; overflow:hidden; transition:flex-basis .18s, width .18s;">
            <div style="flex:0 0 auto; padding:16px 18px 12px; border-bottom:1px solid var(--line); min-width:456px;">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:11px;">
                  <span style="display:flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:10px; background:var(--accent-soft-bg); color:var(--note-fg);">${icon("sparkles", 20)}</span>
                  <div>
                    <div style="font-size:16px; font-weight:700; color:var(--text-bright);">VLearn Tutor</div>
                    <div style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--page-label); margin-top:2px;"><span style="width:7px;height:7px;border-radius:50%;background:${this.coChuTrang() ? "#34d399" : "#e0a83a"};display:inline-block;"></span>${this.coChuTrang() ? `Đang đọc ${this.slideText().length} ký tự của trang ${s.page}` : "Trang này chưa trích được chữ"}</div>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <button data-action="newChat" style="display:flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:9px; background:var(--btn-bg); border:1px solid var(--btn-bd); color:var(--icon); cursor:pointer;">${icon("plus", 18)}</button>
                  <span style="display:flex; align-items:center; height:34px; padding:0 12px; border-radius:9px; background:var(--btn-bg); border:1px solid var(--btn-bd); color:var(--text-mid); font-size:12.5px; font-weight:600;">${esc(v.slidePageBadge)}</span>
                </div>
              </div>
              <div style="display:flex; align-items:center; justify-content:space-between; margin-top:16px;">
                <span style="font-size:13px; font-weight:600; color:var(--tool-off);">${esc(t.quota)}</span>
                <div style="display:flex; align-items:center; gap:10px;">
                  <span style="font-size:12.5px; color:var(--page-label);">${esc(v.quotaLabel)}</span>
                  <span style="display:flex; align-items:center; gap:6px; height:28px; padding:0 10px; border-radius:8px; background:var(--btn-bg); border:1px solid var(--btn-bd); color:#e0b84a; font-size:11.5px; font-weight:700;">${icon("key-round", 13)}BYOK</span>
                </div>
              </div>
              <div style="height:6px; border-radius:6px; background:var(--btn-bg); margin-top:9px; overflow:hidden;"><div style="width:${v.quotaPct}; height:100%; background:var(--accent); border-radius:6px; transition:width .3s;"></div></div>
            </div>

            <div id="vl-chat" class="vl-scroll" style="flex:1; min-height:0; overflow-y:auto; padding:18px 18px 12px; display:flex; flex-direction:column; gap:18px; min-width:456px;">
              ${this.renderMessages()}
              ${this.renderSending()}
            </div>

            <div style="flex:0 0 auto; padding:12px 18px 18px; border-top:1px solid var(--line); min-width:456px;">
              <div class="vl-chip-row">
                <span class="vl-chip-label">${esc(t.suggestLabel)}</span>
                <button data-suggestion="${esc(t.sumSlide)} (trang ${s.page})" class="vl-chip">${esc(t.sumSlide)}</button>
                <button data-suggestion="${esc(t.explain)} nội dung trang ${s.page}" class="vl-chip">${esc(t.explain)}</button>
                ${goiY.map((g) => `<button data-suggestion="${esc(g.prompt)}" class="vl-chip">${esc(g.label)}</button>`).join("")}
              </div>

              <div style="display:flex; align-items:center; gap:10px; background:var(--soft-bg); border:1px solid var(--btn-bd); border-radius:13px; padding:6px 6px 6px 16px;">
                <input id="vl-input" value="${esc(s.input)}" placeholder="${esc(t.placeholder)}" style="flex:1; background:transparent; border:none; outline:none; color:var(--text); font-size:14px; font-family:inherit;" />
                <button data-action="send" style="display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:10px; background:var(--accent); border:none; color:#fff; cursor:pointer;">${icon("send", 18)}</button>
              </div>
            </div>
          </aside>
        </div>`}
      </div>`;

    this.bind();
    this.scrollChat();
    this.restoreFocus(focusId, caret, caretEnd);
    // Gọi THẲNG, không qua requestAnimationFrame: tab đang ở nền thì trình
    // duyệt không vẽ frame nào, rAF không bao giờ chạy và canvas kẹt ở kích
    // thước mặc định 300x150 -> nét bút lệch hẳn khỏi con trỏ. Đo đồng bộ luôn
    // được vì layout đã tính xong ngay sau khi gán innerHTML; ResizeObserver
    // bên trong chỉ còn lo phần chỉnh lại khi ảnh slide tải xong.
    if (s.view === "reader") this.chuanBiCanvas();
  }

  bind() {
    const actions = {
      toggleLang: () => this.setState((s) => ({ lang: s.lang === "vi" ? "en" : "vi", goiY: [] })),
      toggleTheme: () => this.setState((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setRead: () => this.setState({ tool: "read" }),
      setPen: () => this.setState({ tool: "pen" }),
      setEraser: () => this.setState({ tool: "eraser" }),
      setCrop: () => this.setState({ tool: "crop" }),
      clearInk: () => this.xoaNet(),
      zoomIn: () => this.setState((s) => ({ zoom: Math.min(260, s.zoom + 15) })),
      zoomOut: () => this.setState((s) => ({ zoom: Math.max(60, s.zoom - 15) })),
      prevPage: () => this.goto(this.state.page - 1),
      nextPage: () => this.goto(this.state.page + 1),
      toggleLeft: () => this.setState((s) => ({ leftOpen: !s.leftOpen })),
      toggleRight: () => this.setState((s) => ({ rightOpen: !s.rightOpen })),
      toggleText: () => this.setState((s) => ({ chuMoRong: !s.chuMoRong })),
      toggleNote: () => this.toggleNote(),
      clearNote: () => this.xoaGhiChu(),
      fullscreen: () => this.toanManHinh(),
      teachDeck: () => this.giangCaFile(),
      outline: () => this.danYCaFile(),
      newChat: () => this.newChat(),
      send: () => this.send(),
      startQuiz: () => this.startQuiz(),
    };

    this.root.querySelectorAll("[data-view]").forEach((el) => {
      el.addEventListener("click", () => this.setState({ view: el.dataset.view }));
    });
    this.root.querySelectorAll("[data-action]").forEach((el) => {
      el.addEventListener("click", () => actions[el.dataset.action]?.());
    });
    this.root.querySelectorAll("[data-doc]").forEach((el) => {
      el.addEventListener("click", () => this.selectDoc(el.dataset.doc));
    });
    this.root.querySelectorAll("[data-group]").forEach((el) => {
      el.addEventListener("click", () => {
        const day = el.dataset.group;
        this.setState((s) => ({ collapsed: { ...s.collapsed, [day]: !s.collapsed[day] } }));
      });
    });
    this.root.querySelectorAll("[data-notebook-tab]").forEach((el) => {
      el.addEventListener("click", () => this.setState({ notebookTab: el.dataset.notebookTab }));
    });
    this.root.querySelectorAll("[data-suggestion]").forEach((el) => {
      el.addEventListener("click", () => this.quickAsk(el.dataset.suggestion));
    });

    // Lật thẻ flashcard — bản cũ có markup nhưng chưa gắn sự kiện nào, bấm vào
    // thẻ không có gì xảy ra.
    this.root.querySelectorAll("[data-flashcard]").forEach((el) => {
      el.addEventListener("click", () => {
        el.querySelector(".vl-flashcard-inner")?.classList.toggle("flipped");
      });
    });
    this.root.querySelectorAll("[data-srs]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        this.setState((s) => ({ srs: { ...s.srs, [el.dataset.card]: el.dataset.srs } }));
      });
    });

    const note = this.root.querySelector("#vl-note-input");
    if (note) note.addEventListener("input", (e) => this.luuGhiChu(e.target.value));

    const input = this.root.querySelector("#vl-input");
    if (input) {
      input.addEventListener("input", (e) => { this.state.input = e.target.value; });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.send();
        }
      });
    }
  }

  restoreFocus(focusId, caret, caretEnd) {
    if (!focusId) return;
    const input = this.root.querySelector("#" + focusId);
    if (!input) return;
    input.focus();
    const n = input.value.length;
    try {
      input.setSelectionRange(Math.min(caret ?? n, n), Math.min(caretEnd ?? n, n));
    } catch (_) {}
  }

  scrollChat() {
    const chat = this.root.querySelector("#vl-chat");
    if (chat) chat.scrollTop = chat.scrollHeight;
  }
}

const reader = new VLearnReader(document.getElementById("app"));
reader.boot();
