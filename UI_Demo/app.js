import { get as apiGet } from "./vlearn-api.js";
import { icon } from "./icons.js";
import { TutorClient } from "./tutor.js";

const START_PAGE = 37;
const DEFAULT_ZOOM = 155;

const TUTOR_SYSTEM_PROMPT = "Bạn là VLearn Tutor, trợ lý học tập theo ngữ cảnh cho khoá COMP2010. Trả lời ngắn gọn, rõ ràng bằng tiếng Việt, bám sát nội dung slide được cung cấp. Nếu câu hỏi nằm ngoài slide, vẫn hỗ trợ nhưng nhắc người học quay lại nội dung bài.";

const T = {
  vi: {
    student: "Sinh viên ẩn danh",
    read: "Đọc",
    pen: "Bút",
    highlight: "Highlight",
    page: "Trang",
    trang: "trang",
    quota: "Quota Tutor trong ngày",
    cau: "câu",
    tutorDesc: "Trợ lý học theo ngữ cảnh",
    placeholder: "Nhập câu hỏi hoặc bôi đen tài liệu...",
    sumSlide: "Tóm tắt slide này",
    explain: "Giải thích đơn giản",
  },
  en: {
    student: "Anonymous student",
    read: "Read",
    pen: "Pen",
    highlight: "Highlight",
    page: "Page",
    trang: "pages",
    quota: "Tutor quota today",
    cau: "msgs",
    tutorDesc: "Context-aware study assistant",
    placeholder: "Ask a question or highlight the document...",
    sumSlide: "Summarize this slide",
    explain: "Explain simply",
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

class VLearnReader {
  constructor(root) {
    this.root = root;
    this.tutor = new TutorClient();
    this.state = {
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
      messages: [
        {
          id: 1,
          isUser: false,
          isBot: true,
          hasContext: false,
          text: "Xin chào! Mình là VLearn Tutor. Hãy đặt câu hỏi về slide hiện tại hoặc bôi đen một đoạn trong tài liệu để mình giải thích nhé.",
        },
      ],
    };
  }

  async boot() {
    this.render();
    try {
      const lectures = await apiGet("/course/COMP2010/lectures");
      this.setState({ lectures });
      await this.loadPage();
    } catch (err) {
      console.warn("Không tải được dữ liệu demo", err);
    }
  }

  setState(patch, afterRender) {
    const next = typeof patch === "function" ? patch(this.state) : patch;
    this.state = { ...this.state, ...next };
    this.render();
    if (afterRender) afterRender();
  }

  async loadPage() {
    const { materialId, page } = this.state;
    try {
      const slide = await apiGet(`/materials/${materialId}/pages/${page}`);
      this.setState({ slide, total: slide.total });
    } catch (err) {
      console.warn("Không tải được trang", err);
    }
  }

  goto(n) {
    const page = Math.max(1, Math.min(this.state.total, n));
    if (page === this.state.page) return;
    this.setState((s) => ({
      page,
      pageByMat: { ...s.pageByMat, [s.materialId]: page },
    }));
    this.loadPage();
  }

  async selectDoc(id) {
    if (id === this.state.materialId) return;
    try {
      const mat = await apiGet(`/materials/${id}`);
      const page = this.state.pageByMat[id] || 1;
      this.setState((s) => ({
        materialId: id,
        materialName: mat.name,
        total: mat.pages,
        page,
        pageByMat: { ...s.pageByMat, [id]: page },
      }));
      await this.loadPage();
    } catch (err) {
      console.warn("Không chọn được tài liệu", err);
    }
  }

  slideText() {
    const s = this.state.slide || {};
    if (s.kind === "chart") {
      return 'Slide "Trust calibration": biểu đồ hai trục — Trust in AI system (dọc) và AI capability (ngang). Overtrust = lòng tin vượt năng lực AI; Distrust = lòng tin thấp hơn năng lực AI; đường chéo Calibrated trust là mục tiêu thiết kế.';
    }
    let text = `${s.title || ""}. `;
    if (s.highlight) text += `${s.highlight}. `;
    if (s.bullets) text += s.bullets.join(" ");
    return text.trim();
  }

  async send() {
    const text = (this.state.input || "").trim();
    if (!text || this.state.sending) return;

    const page = this.state.page;
    const userMessage = { id: Date.now(), isUser: true, isBot: false, hasContext: false, text };
    const base = [...this.state.messages, userMessage];
    this.setState({
      messages: base,
      input: "",
      sending: true,
      quota: Math.min(this.state.quotaMax, this.state.quota + 1),
    });

    const ctx = `Ngữ cảnh: Slide trang ${page}`;
    try {
      const history = base.slice(-9, -1).map((m) => ({
        role: m.isUser ? "user" : "assistant",
        content: m.text,
      }));
      const reply = await this.tutor.complete({
        system: TUTOR_SYSTEM_PROMPT,
        messages: [
          ...history,
          {
            role: "user",
            content: `Nội dung slide (trang ${page}): ${this.slideText()}\n\nCâu hỏi của sinh viên: ${text}`,
          },
        ],
        max_tokens: 700,
      });
      this.setState((s) => ({
        messages: [...s.messages, {
          id: Date.now() + 1,
          isUser: false,
          isBot: true,
          hasContext: true,
          context: ctx,
          text: reply,
        }],
        sending: false,
      }));
    } catch (err) {
      this.setState((s) => ({
        messages: [...s.messages, {
          id: Date.now() + 1,
          isUser: false,
          isBot: true,
          hasContext: true,
          context: ctx,
          text: "AI hiện không thể trả lời. Vui lòng thử lại sau ít phút.",
        }],
        sending: false,
      }));
    }
  }

  quickAsk(prompt) {
    this.state.input = prompt;
    this.send();
  }

  newChat() {
    this.setState({
      messages: [{
        id: Date.now(),
        isUser: false,
        isBot: true,
        hasContext: false,
        text: `Cuộc trò chuyện mới. Bạn muốn hỏi gì về slide trang ${this.state.page}?`,
      }],
    });
  }

  vals() {
    const s = this.state;
    const t = T[s.lang];
    const sl = s.slide || {};
    const scale = (s.zoom / 140).toFixed(3);
    const toolStyle = (name) => s.tool === name
      ? { bg: "var(--tool-on-bg)", fg: "var(--tool-on-fg)" }
      : { bg: "transparent", fg: "var(--tool-off)" };
    const rd = toolStyle("read");
    const pn = toolStyle("pen");
    const hl = toolStyle("highlight");

    return {
      s,
      t,
      sl,
      kind: sl.kind || "generic",
      langLabel: s.lang === "vi" ? "VI" : "EN",
      noteBadge: `${t.page} ${s.page} · 1 note`,
      zoomLabel: `${s.zoom}%`,
      slideScale: `scale(${scale})`,
      slideWrapMinHeight: `${Math.round(600 * s.zoom / 140)}px`,
      leftChevronRot: s.leftOpen ? "none" : "rotate(180deg)",
      rightChevronRot: s.rightOpen ? "none" : "rotate(180deg)",
      leftBasis: s.leftOpen ? "344px" : "0px",
      rightBasis: s.rightOpen ? "456px" : "0px",
      slidePageBadge: `Trang slide: ${s.page}`,
      quotaLabel: `${s.quota} / ${s.quotaMax} ${t.cau}`,
      quotaPct: `${Math.round((s.quota / s.quotaMax) * 100)}%`,
      rd,
      pn,
      hl,
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
    if (kind === "chart") return this.renderChartSlide(sl);
    if (kind === "bullets") return this.renderBulletsSlide(sl);
    return this.renderGenericSlide(sl);
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

  renderMessages() {
    return this.state.messages.map((m) => {
      const ctx = m.hasContext
        ? `<div style="font-family:ui-monospace, Menlo, monospace; font-size:11px; color:var(--ctx-label); margin-bottom:8px;">${esc(m.context)}</div>`
        : "";
      const body = m.isUser
        ? `<div style="display:flex; justify-content:flex-end;"><div style="max-width:80%; background:var(--accent); color:#fff; border-radius:14px 14px 4px 14px; padding:12px 16px; font-size:14.5px; line-height:1.45; font-weight:500; white-space:pre-wrap;">${esc(m.text)}</div></div>`
        : `<div style="background:var(--soft-bg); border:1px solid var(--card-bd); border-radius:14px; padding:14px 16px; font-size:14.5px; line-height:1.55; color:var(--text); white-space:pre-wrap;">${esc(m.text)}</div>`;
      return `<div>${ctx}${body}</div>`;
    }).join("");
  }

  renderSending() {
    if (!this.state.sending) return "";
    return `
      <div style="display:flex; gap:6px; align-items:center; background:var(--soft-bg); border:1px solid var(--card-bd); border-radius:14px; padding:16px; width:76px;">
        <span style="width:8px;height:8px;border-radius:50%;background:var(--note-fg);animation:vlblink 1.2s infinite;"></span>
        <span style="width:8px;height:8px;border-radius:50%;background:var(--note-fg);animation:vlblink 1.2s infinite .2s;"></span>
        <span style="width:8px;height:8px;border-radius:50%;background:var(--note-fg);animation:vlblink 1.2s infinite .4s;"></span>
      </div>`;
  }

  render() {
    // render() thay toàn bộ DOM bằng innerHTML, nên ô nhập bị dựng lại và mất
    // focus. Nếu học viên đang gõ mà một câu trả lời về (setState -> render),
    // con trỏ sẽ văng ra khỏi ô. Ghi nhớ trạng thái con trỏ trước khi dựng lại,
    // khôi phục ở cuối hàm.
    const prevInput = this.root.querySelector("#vl-input");
    const hadFocus = prevInput && document.activeElement === prevInput;
    const caret = hadFocus ? prevInput.selectionStart : null;
    const caretEnd = hadFocus ? prevInput.selectionEnd : null;

    const v = this.vals();
    const { s, t, rd, pn, hl } = v;
    this.root.innerHTML = `
      <div id="vlroot" data-theme="${esc(s.theme)}" style="display:flex; flex-direction:column; height:100vh; width:100vw; background:var(--app-bg); color:var(--text); overflow:hidden; font-size:14px;">
        <header style="display:flex; align-items:center; justify-content:space-between; height:64px; flex:0 0 64px; padding:0 20px; background:var(--panel-bg); border-bottom:1px solid var(--line);">
          <div style="display:flex; align-items:center; gap:14px;">
            <button style="display:flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:10px; background:var(--btn-bg); border:1px solid var(--btn-bd); color:var(--icon); cursor:pointer;">${icon("chevron-left", 20)}</button>
            <div style="display:flex; align-items:center; gap:9px;">
              <span style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:8px; background:#0f2a1c; color:#34d399;">${icon("mountain-snow", 20)}</span>
              <span style="font-size:19px; font-weight:700; letter-spacing:.2px;">VLearn</span>
            </div>
            <div style="width:1px; height:30px; background:var(--btn-bd); margin:0 6px;"></div>
            <button style="display:flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:10px; background:var(--btn-bg); border:1px solid var(--btn-bd); color:var(--icon); cursor:pointer;">${icon("book-open", 19)}</button>
            <div style="display:flex; flex-direction:column; gap:2px;">
              <span style="font-size:17px; font-weight:700; color:var(--text-bright);">${esc(s.materialName)}</span>
              <span style="font-family:ui-monospace, Menlo, monospace; font-size:11.5px; color:var(--mono-sub); letter-spacing:.2px;">COMP2010 · ${esc(s.materialId)}</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <button data-action="toggleLang" style="display:flex; align-items:center; justify-content:center; width:44px; height:38px; border-radius:10px; background:var(--btn-bg); border:1px solid var(--btn-bd); color:var(--text-mid); font-weight:700; font-size:13px; cursor:pointer;">${esc(v.langLabel)}</button>
            <button data-action="toggleTheme" style="display:flex; align-items:center; justify-content:center; width:40px; height:38px; border-radius:10px; background:var(--btn-bg); border:1px solid var(--btn-bd); color:var(--text-mid); cursor:pointer;">${icon("sun-moon", 19)}</button>
            <button style="display:flex; align-items:center; gap:8px; height:38px; padding:0 16px; border-radius:10px; background:var(--btn-bg); border:1px solid var(--btn-bd); color:var(--text); font-weight:600; font-size:13.5px; cursor:pointer;">${icon("user-round", 17)}${esc(t.student)}</button>
          </div>
        </header>
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
            <div style="display:flex; align-items:center; gap:14px; padding:16px 22px 12px; flex-wrap:wrap;">
              <div style="display:flex; align-items:center; gap:2px; background:var(--card-bg); border:1px solid var(--card-bd); border-radius:11px; padding:4px;">
                <button data-action="setRead" style="display:flex; align-items:center; gap:7px; height:34px; padding:0 14px; border-radius:8px; background:${rd.bg}; border:none; color:${rd.fg}; font-weight:600; font-size:13.5px; cursor:pointer;">${icon("mouse-pointer-2", 16)}${esc(t.read)}</button>
                <button data-action="setPen" style="display:flex; align-items:center; gap:7px; height:34px; padding:0 14px; border-radius:8px; background:${pn.bg}; border:none; color:${pn.fg}; font-weight:600; font-size:13.5px; cursor:pointer;">${icon("pencil", 16)}${esc(t.pen)}</button>
                <button data-action="setHl" style="display:flex; align-items:center; gap:7px; height:34px; padding:0 14px; border-radius:8px; background:${hl.bg}; border:none; color:${hl.fg}; font-weight:600; font-size:13.5px; cursor:pointer;">${icon("highlighter", 16)}${esc(t.highlight)}</button>
                <button style="display:flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:8px; background:transparent; border:none; color:var(--tool-off); cursor:pointer;">${icon("more-horizontal", 18)}</button>
              </div>
              <div style="display:flex; align-items:center; height:36px; padding:0 14px; border-radius:9px; background:var(--accent-soft-bg); border:1px solid var(--note-bd); color:var(--note-fg); font-weight:600; font-size:13px;">${esc(v.noteBadge)}</div>
              <div style="display:flex; align-items:center; gap:2px; background:var(--card-bg); border:1px solid var(--card-bd); border-radius:10px; padding:4px 6px;">
                <button data-action="zoomOut" style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:7px; background:transparent; border:none; color:var(--tool-off); cursor:pointer;">${icon("minus", 16)}</button>
                <span style="min-width:44px; text-align:center; font-size:13px; font-weight:600; color:var(--text-mid);">${esc(v.zoomLabel)}</span>
                <button data-action="zoomIn" style="display:flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:7px; background:transparent; border:none; color:var(--tool-off); cursor:pointer;">${icon("plus", 16)}</button>
              </div>
              <div style="display:flex; align-items:center; gap:6px;">
                <button data-action="zoomIn" style="display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:9px; background:var(--card-bg); border:1px solid var(--card-bd); color:var(--tool-off); cursor:pointer;">${icon("plus", 17)}</button>
                <button data-action="zoomOut" style="display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:9px; background:var(--card-bg); border:1px solid var(--card-bd); color:var(--tool-off); cursor:pointer;">${icon("minus", 17)}</button>
                <button style="display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:9px; background:var(--card-bg); border:1px solid var(--card-bd); color:var(--tool-off); cursor:pointer;">${icon("download", 17)}</button>
                <button style="display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:9px; background:var(--card-bg); border:1px solid var(--card-bd); color:var(--tool-off); cursor:pointer;">${icon("file-down", 17)}</button>
                <button style="display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:9px; background:var(--card-bg); border:1px solid var(--card-bd); color:var(--tool-off); cursor:pointer;">${icon("rotate-ccw", 17)}</button>
                <button style="display:flex; align-items:center; justify-content:center; width:36px; height:36px; border-radius:9px; background:var(--card-bg); border:1px solid var(--card-bd); color:#e57373; cursor:pointer;">${icon("trash-2", 17)}</button>
              </div>
            </div>
            <div class="vl-scroll" style="flex:1; min-height:0; overflow:auto; padding:6px 40px 24px;">
              <div style="font-size:15px; color:var(--page-label); margin:0 0 12px 6px;">${esc(t.page)} ${esc(s.page)} / ${esc(s.total)}</div>
              <div style="display:flex; justify-content:center; min-height:${v.slideWrapMinHeight};">
                <div style="width:820px; transform:${v.slideScale}; transform-origin:top center; background:#ffffff; border-radius:22px; box-shadow:0 10px 40px rgba(0,0,0,.18); color:#1a1a1a;">${this.renderSlide()}</div>
              </div>
            </div>
            <button data-action="toggleLeft" style="position:absolute; left:0; top:50%; transform:translateY(-50%); display:flex; align-items:center; justify-content:center; width:34px; height:70px; border-radius:0 14px 14px 0; background:var(--card-bg); border:1px solid var(--card-bd); border-left:none; color:var(--icon); cursor:pointer;">${ico("chevron-left", 18, `transition:transform .18s; transform:${v.leftChevronRot}`)}</button>
            <button data-action="toggleRight" style="position:absolute; right:0; top:50%; transform:translateY(-50%); display:flex; align-items:center; justify-content:center; width:34px; height:70px; border-radius:14px 0 0 14px; background:var(--card-bg); border:1px solid var(--card-bd); border-right:none; color:var(--icon); cursor:pointer;">${ico("chevron-right", 18, `transition:transform .18s; transform:${v.rightChevronRot}`)}</button>
            <div style="flex:0 0 auto; display:flex; justify-content:center; padding:16px;">
              <div style="display:flex; align-items:center; gap:14px; background:var(--card-bg); border:1px solid var(--card-bd); border-radius:12px; padding:8px 14px;">
                <button data-action="prevPage" style="display:flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:9px; background:var(--pager-bg); border:1px solid var(--btn-bd); color:var(--tool-off); cursor:pointer;">${icon("chevron-left", 18)}</button>
                <span style="font-size:14px; color:var(--text-mid);">${esc(t.page)} <b style="color:var(--text-bright);">${esc(s.page)}</b> <span style="color:var(--muted);">/ ${esc(s.total)}</span></span>
                <button data-action="nextPage" style="display:flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:9px; background:var(--pager-bg); border:1px solid var(--btn-bd); color:var(--tool-off); cursor:pointer;">${icon("chevron-right", 18)}</button>
              </div>
            </div>
          </main>
          <aside style="flex:0 0 ${v.rightBasis}; width:${v.rightBasis}; background:var(--side-bg); border-left:1px solid var(--line); display:flex; flex-direction:column; min-height:0; overflow:hidden; transition:flex-basis .18s, width .18s;">
            <div style="flex:0 0 auto; padding:16px 18px 12px; border-bottom:1px solid var(--line); min-width:456px;">
              <div style="display:flex; align-items:center; justify-content:space-between;">
                <div style="display:flex; align-items:center; gap:11px;">
                  <span style="display:flex; align-items:center; justify-content:center; width:38px; height:38px; border-radius:10px; background:var(--accent-soft-bg); color:var(--note-fg);">${icon("sparkles", 20)}</span>
                  <div>
                    <div style="font-size:16px; font-weight:700; color:var(--text-bright);">VLearn Tutor</div>
                    <div style="display:flex; align-items:center; gap:6px; font-size:12px; color:var(--page-label); margin-top:2px;"><span style="width:7px;height:7px;border-radius:50%;background:#34d399;display:inline-block;"></span>${esc(t.tutorDesc)}</div>
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <button style="display:flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:9px; background:var(--btn-bg); border:1px solid var(--btn-bd); color:var(--icon); cursor:pointer;">${icon("history", 17)}</button>
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
              <div style="display:flex; gap:8px; margin-bottom:10px; flex-wrap:wrap;">
                <button data-suggestion="sum" style="height:30px; padding:0 12px; border-radius:8px; background:var(--soft-bg); border:1px solid var(--btn-bd); color:var(--icon); font-size:12.5px; cursor:pointer;">${esc(t.sumSlide)}</button>
                <button data-suggestion="explain" style="height:30px; padding:0 12px; border-radius:8px; background:var(--soft-bg); border:1px solid var(--btn-bd); color:var(--icon); font-size:12.5px; cursor:pointer;">${esc(t.explain)}</button>
              </div>
              <div style="display:flex; align-items:center; gap:10px; background:var(--soft-bg); border:1px solid var(--btn-bd); border-radius:13px; padding:6px 6px 6px 16px;">
                <input id="vl-input" value="${esc(s.input)}" placeholder="${esc(t.placeholder)}" style="flex:1; background:transparent; border:none; outline:none; color:var(--text); font-size:14px; font-family:inherit;" />
                <button data-action="send" style="display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:10px; background:var(--accent); border:none; color:#fff; cursor:pointer;">${icon("send", 18)}</button>
              </div>
            </div>
          </aside>
        </div>
      </div>`;
    this.bind();
    this.scrollChat();
    this.restoreFocus(hadFocus, caret, caretEnd);
  }

  bind() {
    const actions = {
      toggleLang: () => this.setState((s) => ({ lang: s.lang === "vi" ? "en" : "vi" })),
      toggleTheme: () => this.setState((s) => ({ theme: s.theme === "dark" ? "light" : "dark" })),
      setRead: () => this.setState({ tool: "read" }),
      setPen: () => this.setState({ tool: "pen" }),
      setHl: () => this.setState({ tool: "highlight" }),
      zoomIn: () => this.setState((s) => ({ zoom: Math.min(260, s.zoom + 15) })),
      zoomOut: () => this.setState((s) => ({ zoom: Math.max(60, s.zoom - 15) })),
      prevPage: () => this.goto(this.state.page - 1),
      nextPage: () => this.goto(this.state.page + 1),
      toggleLeft: () => this.setState((s) => ({ leftOpen: !s.leftOpen })),
      toggleRight: () => this.setState((s) => ({ rightOpen: !s.rightOpen })),
      newChat: () => this.newChat(),
      send: () => this.send(),
    };

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
    this.root.querySelectorAll("[data-suggestion]").forEach((el) => {
      el.addEventListener("click", () => {
        const t = T[this.state.lang];
        const prompt = el.dataset.suggestion === "sum"
          ? `${t.sumSlide} (trang ${this.state.page})`
          : t.explain;
        this.quickAsk(prompt);
      });
    });

    const input = this.root.querySelector("#vl-input");
    if (input) {
      input.addEventListener("input", (e) => {
        this.state.input = e.target.value;
      });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          this.send();
        }
      });
    }
  }

  // Trả con trỏ về đúng chỗ sau khi render() dựng lại DOM.
  restoreFocus(hadFocus, caret, caretEnd) {
    if (!hadFocus) return;
    const input = this.root.querySelector("#vl-input");
    if (!input) return;
    input.focus();
    const n = input.value.length;
    // Sau khi gửi xong thì ô rỗng, selectionStart cũ không còn hợp lệ.
    try {
      input.setSelectionRange(Math.min(caret ?? n, n), Math.min(caretEnd ?? n, n));
    } catch (_) {
      /* input type không hỗ trợ setSelectionRange — bỏ qua */
    }
  }

  scrollChat() {
    const chat = this.root.querySelector("#vl-chat");
    if (chat) chat.scrollTop = chat.scrollHeight;
  }
}

const reader = new VLearnReader(document.getElementById("app"));
reader.boot();
