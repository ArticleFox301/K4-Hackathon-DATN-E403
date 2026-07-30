// ============================================================
// VLearn mock API — a tiny in-memory REST layer.
// Simulates network endpoints with latency so the reader
// behaves like it is talking to a real backend.
//
//   GET /course/:code
//   GET /course/:code/lectures
//   GET /materials/:id
//   GET /materials/:id/pages/:n
// ============================================================

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const COURSE = {
  code: "COMP2010",
  title: "COMP2010 · AI Product Design",
};

// ---- Materials (documents) -------------------------------------------------
const MATERIALS = {
  material_day04_1: { id: "material_day04_1", name: "day04-prompt-engineering-basics.pdf", pages: 43 },
  material_day04_2: { id: "material_day04_2", name: "day04-prompt-engineering-patterns.pdf", pages: 78 },
  material_day04_3: { id: "material_day04_3", name: "day04-prompt-engineering-advanced.pdf", pages: 98 },
  material_day05_1: { id: "material_day05_1", name: "day05-ai-product-thinking-101.pdf", pages: 44 },
  material_day05_2: { id: "material_day05_2", name: "day05-lecture-slides-batch02.pdf", pages: 39 },
  material_ms5rpr5o_wgl8wy: {
    id: "material_ms5rpr5o_wgl8wy",
    name: "day05-slide-batch03-C401.pdf",
    pages: 62,
    // authored slides — the rest render as generic placeholder pages
    content: {
      36: {
        kind: "bullets",
        title: "Vì sao lòng tin quan trọng với sản phẩm AI",
        bullets: [
          "AI mang tính xác suất: kết quả không phải lúc nào cũng đúng.",
          "Lòng tin quá cao dẫn tới lạm dụng; quá thấp dẫn tới bỏ phí giá trị.",
          "Thiết kế trải nghiệm phải điều chỉnh lòng tin theo năng lực thật của hệ thống.",
        ],
        source: "Designing Human-Centric AI Experiences (Akshay Kore)",
      },
      37: { kind: "chart", title: "Trust calibration" },
      38: {
        kind: "bullets",
        title: "Trust calibration",
        highlight: "Trust calibration = expectation + explainability + control",
        bullets: [
          "Expectation: đặt kỳ vọng đúng về những gì AI làm được và không làm được.",
          "Explainability: giải thích lý do AI đưa ra kết quả để user hiểu và kiểm chứng.",
          "Control: cho user quyền can thiệp, chỉnh sửa hoặc từ chối đề xuất của AI.",
          "Mục tiêu: đưa lòng tin của user về đúng mức năng lực thật của hệ thống.",
        ],
        source: "Designing Human-Centric AI Experiences (Akshay Kore)",
      },
      39: {
        kind: "bullets",
        title: "Explainability trong trải nghiệm AI",
        bullets: [
          "Cho biết AI dựa trên dữ liệu / tín hiệu nào để đưa ra quyết định.",
          "Thể hiện độ tin cậy (confidence) một cách trung thực.",
          "Tránh giải thích quá kỹ thuật gây rối cho người dùng phổ thông.",
        ],
        source: "Designing Human-Centric AI Experiences (Akshay Kore)",
      },
    },
  },
  material_day06_1: { id: "material_day06_1", name: "day06-evaluation-and-testing.pdf", pages: 51 },
};

// ---- Lectures (day groups shown in the sidebar) ----------------------------
const LECTURES = [
  {
    day: "Day 4",
    status: "ACTIVE",
    docIds: ["material_day04_1", "material_day04_2", "material_day04_3"],
  },
  {
    day: "Day 5",
    status: "ACTIVE",
    badge: "STUDYING",
    docIds: ["material_day05_1", "material_day05_2", "material_ms5rpr5o_wgl8wy"],
  },
  {
    day: "Day 6",
    status: "ACTIVE",
    docIds: ["material_day06_1"],
  },
];

function meta(id) {
  const m = MATERIALS[id];
  return m ? { id: m.id, name: m.name, pages: m.pages } : null;
}

function genericPage(mat, n) {
  return {
    page: n,
    total: mat.pages,
    kind: "generic",
    title: mat.name.replace(/\.pdf$/, ""),
    subtitle: "Xem trước trang " + n,
  };
}

// ---- Router ----------------------------------------------------------------
export async function get(path) {
  await delay(110 + Math.random() * 200);
  let m;

  if (path === "/course/COMP2010") return { ...COURSE };

  if (path === "/course/COMP2010/lectures") {
    return LECTURES.map((l) => ({
      day: l.day,
      status: l.status,
      badge: l.badge || null,
      docs: l.docIds.map(meta).filter(Boolean),
    }));
  }

  if ((m = path.match(/^\/materials\/([^/]+)$/))) {
    const mat = MATERIALS[m[1]];
    if (!mat) throw new Error("404 material " + m[1]);
    return meta(mat.id);
  }

  if ((m = path.match(/^\/materials\/([^/]+)\/pages\/(\d+)$/))) {
    const mat = MATERIALS[m[1]];
    if (!mat) throw new Error("404 material " + m[1]);
    let n = Math.max(1, Math.min(mat.pages, parseInt(m[2], 10)));
    const authored = mat.content && mat.content[n];
    if (authored) return { page: n, total: mat.pages, ...authored };
    return genericPage(mat, n);
  }

  throw new Error("404 " + path);
}

export const courseCode = COURSE.code;
