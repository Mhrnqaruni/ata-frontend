import api from "./api";
const tagService = {
  list: () => api.get("/api/tags").then((r) => r.data),
  create: (name) => api.post("/api/tags", { name }).then((r) => r.data),
  update: (id, body) => api.put(`/api/tags/${id}`, body).then((r) => r.data),
  members: (id, student_ids) =>
    api.put(`/api/tags/${id}/members`, { student_ids }).then((r) => r.data),
  preview: (selection) =>
    api.post("/api/tags/audience-preview", selection).then((r) => r.data),
  analytics: (params) =>
    api.get("/api/tags/analytics", { params }).then((r) => r.data),
};
export default tagService;
