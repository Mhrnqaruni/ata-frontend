// The one way parent mode reaches the server: every family and children call, and the cache keys they use.
// Pages and hooks call these, never the API client (Phase 1.37, S2.2; SOT B0).
// Area: family

import api from '../../services/api';

const CHILDREN = '/api/parent/settings/manual-learners';
const child = (childId) => `/api/family/children/${childId}`;
const data = (request) => request.then((response) => response.data);
// Uploads are multipart bodies, which the browser labels itself, and may take minutes.
const multipart = (timeout) => ({ timeout, headers: { 'Content-Type': undefined } });

/** React Query keys, as parent mode has always used them: scoped by session, adult and child. */
export const familyKeys = {
  children: (generation, userId) => ['family', generation, userId, 'children'],
  topics: (generation, userId) => ['family', generation, userId, 'topics'],
  child: (generation, userId, childId) => ['family', generation, userId, childId],
  home: (generation, userId, childId) => ['family', generation, userId, childId, 'home'],
  material: (generation, userId, childId, id) => ['family', generation, userId, childId, 'material', id],
  activity: (generation, userId, childId, id) => ['family', generation, userId, childId, 'activity', id],
  activities: (generation, userId, childId, filter) => ['family', generation, userId, childId, 'activities', filter],
  chats: (generation, userId, childId) => ['family', generation, userId, childId, 'chats'],
  conversation: (generation, userId, childId, id) => ['family', generation, userId, childId, 'conversation', id],
};

/** Each call returns the response's data. A config is passed on to the API client (a signal, params). */
export const familyApi = {
  // The parent's children, which the parent module keeps.
  children: (config) => data(api.get(CHILDREN, config)),
  saveChild: (childId, body, { edit }) =>
    data(edit ? api.patch(`${CHILDREN}/${childId}`, body) : api.put(`${CHILDREN}/${childId}`, body)),
  removeChild: (childId) => data(api.delete(`${CHILDREN}/${childId}`)),

  // A child's notebook home, starter topics and materials.
  home: (childId, config) => data(api.get(child(childId), config)),
  topics: (config) => data(api.get('/api/family/topics', config)),
  addTopic: (childId, id, topicId) => data(api.put(`${child(childId)}/topics/${id}`, { topicId })),
  material: (childId, id, config) => data(api.get(`${child(childId)}/materials/${id}`, config)),
  materialFile: (childId, id, index) =>
    data(api.get(`${child(childId)}/materials/${id}/files/${index}`, { responseType: 'blob' })),
  uploadMaterial: (childId, id, form, onUploadProgress) =>
    data(api.put(`${child(childId)}/materials/${id}`, form, { ...multipart(120000), onUploadProgress })),

  // Activities, their attempts and their saved progress.
  activity: (childId, id, config) => data(api.get(`${child(childId)}/activities/${id}`, config)),
  listActivities: (childId, filter, config) =>
    data(api.get(`${child(childId)}/activities`, listConfig(filter, config))),
  startActivity: (childId, id, body) => data(api.put(`${child(childId)}/activities/${id}`, body)),
  saveAttempt: (childId, activityId, id, answers) =>
    data(api.put(`${child(childId)}/activities/${activityId}/attempts/${id}`, { answers })),
  progress: (childId, activityId, config) =>
    data(api.get(`${child(childId)}/activities/${activityId}/progress`, config)),
  saveProgress: (childId, activityId, body) =>
    data(api.put(`${child(childId)}/activities/${activityId}/progress`, body)),

  // Chats: the latest, one by id, the list, and their messages, materials and dictations.
  latestChat: (childId, config) => data(api.get(`${child(childId)}/conversation`, config)),
  chat: (childId, id, config) => data(api.get(`${child(childId)}/conversations/${id}`, config)),
  chats: (childId, config) => data(api.get(`${child(childId)}/conversations`, config)),
  newChat: (childId, id) => data(api.put(`${child(childId)}/conversation/${id}`)),
  updateChat: (childId, id, body) => data(api.patch(`${child(childId)}/conversations/${id}`, body)),
  setChatPreference: (childId, id, preference) =>
    data(api.patch(`${child(childId)}/conversation/${id}`, { preference })),
  sendMessage: (childId, id, payload) => data(api.put(`${child(childId)}/conversation/messages/${id}`, payload)),
  attachMaterial: (childId, chatId, materialId) =>
    data(api.put(`${child(childId)}/conversations/${chatId}/materials/${materialId}`)),
  dictation: (childId, chatId, id) => data(api.get(`${child(childId)}/conversations/${chatId}/dictations/${id}`)),
  sendDictation: (childId, chatId, id, form) =>
    data(api.put(`${child(childId)}/conversations/${chatId}/dictations/${id}`, form, multipart(110000))),
};

// The list's query: `kind` may repeat (?kind=quiz&kind=check), which the API client's own params wouldn't write.
function listConfig({ kind, before, limit } = {}, config = {}) {
  const params = new URLSearchParams();
  [].concat(kind ?? []).forEach((value) => params.append('kind', value));
  if (before) params.set('before', before);
  if (limit) params.set('limit', String(limit));
  return { ...config, params };
}
