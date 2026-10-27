import api from "./api";
const base = "/api/quick-assessments";
const options = {
  timeout: 120000,
  headers: { "Content-Type": "multipart/form-data" },
};
const append = (body, key, files) =>
  files.forEach((file) => body.append(key, file));
export default {
  list: async () => (await api.get(base)).data.preparations,
  get: async (id) => (await api.get(`${base}/${id}`, { timeout: 15000 })).data,
  start: async (id, settings, files) => {
    const body = new FormData();
    body.append("request_id", id);
    body.append("settings", JSON.stringify(settings));
    append(body, "student_file", files.students);
    append(body, "question_file", files.questions);
    append(body, "answer_key_file", files.keys);
    return (await api.post(base, body, options)).data;
  },
  resume: async (id, revision, groups, config, files) => {
    const body = new FormData();
    body.append("revision", revision);
    if (groups) body.append("groups", JSON.stringify(groups));
    if (config) body.append("config", JSON.stringify(config));
    append(body, "question_file", files.questions);
    append(body, "answer_key_file", files.keys);
    return (await api.post(`${base}/${id}/resume`, body, options)).data;
  },
  remove: async (id) => (await api.delete(`${base}/${id}`)).data,
  page: async (id, source, page) =>
    (
      await api.get(`${base}/${id}/pages/${source}/${page}`, {
        responseType: "blob",
      })
    ).data,
};
