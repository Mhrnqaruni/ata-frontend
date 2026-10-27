import api from "./api";
export default {
  start: async (id, draft, questions, keys) => {
    const body = new FormData();
    body.append("request_id", id);
    body.append("draft", JSON.stringify(draft));
    questions.forEach((file) => body.append("question_file", file));
    keys.forEach((file) => body.append("answer_key_file", file));
    return (
      await api.post("/api/assessment-analyses", body, {
        timeout: 120000,
        headers: { "Content-Type": "multipart/form-data" },
      })
    ).data;
  },
  get: async (id) =>
    (await api.get(`/api/assessment-analyses/${id}`, { timeout: 10000 })).data,
};
