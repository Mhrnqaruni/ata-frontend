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
  reference: async (requestId, config, retryJobId) =>
    (await api.post("/api/assessment-analyses/reference", {requestId, config, retryJobId}, {timeout: 15000})).data,
  source: async (id, item) => {
    const response=await api.get(`/api/assessment-analyses/${id}/sources/${item.index}`,{responseType:'blob'});
    return new File([response.data],item.name);
  },
  get: async (id) =>
    (await api.get(`/api/assessment-analyses/${id}`, { timeout: 10000 })).data,
};
