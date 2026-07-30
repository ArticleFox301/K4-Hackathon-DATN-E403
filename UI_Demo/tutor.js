// Lop client goi tutor noi bo qua server.py.
export class TutorClient {
  constructor(endpoint = "/api/tutor") {
    this.endpoint = endpoint;
  }

  async complete({ system, messages, max_tokens }) {
    const res = await fetch(this.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ system, messages, max_tokens }),
    });
    const data = await res.json().catch(() => ({}));
    return data.reply || "Tutor hiện chưa trả lời được. Vui lòng thử lại sau.";
  }
}
