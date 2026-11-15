// The quiz list's calls (Phase 1.46, SOT-2 to SOT-5, SOT-11): a page of the library, the tags, actions on many quizzes,
// a copy and the example quiz. Each change refreshes the teacher's cached quiz data, so the list and Home follow it.
// Area: quizzes

import api, { apiError } from '../../../services/api';
import { cacheFamilies, invalidateAfter } from '../../../services/queryCache';
import { LIBRARY } from './words';

// The query string FastAPI reads: a repeatable filter once per value (?state=draft&state=ready).
export function queryString(params) {
  const search = new URLSearchParams();
  for (const [name, value] of Object.entries(params)) {
    for (const one of Array.isArray(value) ? value : [value]) {
      if (one !== undefined && one !== null && one !== '') search.append(name, String(one));
    }
  }
  return search.toString();
}

// A failed call as an Error with the API's own sentence (or the fallback), its status and the answer's other fields,
// such as bulk delete's `titles` or a tag rename's `existing_tag_id`.
export const failure = (error, fallback) =>
  Object.assign(apiError(error, fallback), { status: error?.response?.status ?? null, data: error?.response?.data });

const call = async (request, fallback) => {
  try {
    return (await request()).data;
  } catch (error) {
    throw failure(error, fallback);
  }
};
const quizPath = (quizId) => `/api/quizzes/${encodeURIComponent(quizId)}`;

// GET /api/quiz-library: one page of the teacher's quizzes, with the total, the state counts and "Live now" (SOT-2).
export const getLibrary = (params, { signal } = {}) =>
  call(() => api.get(`/api/quiz-library?${queryString(params)}`, { signal }), LIBRARY.loadFailed);

// GET /api/quiz-tags: the teacher's quiz tags by name, each with its number of quizzes (SOT-3).
export const getTags = ({ signal } = {}) => call(() => api.get('/api/quiz-tags', { signal }), LIBRARY.loadFailed);

const tagPath = (tagId) => `/api/quiz-tags/${encodeURIComponent(tagId)}`;

const commands = {
  // POST /api/quiz-library/bulk (SOT-4, SOT-5): archive, unarchive, delete, add_tags or remove_tags for up to 200
  // quizzes, all or nothing; answers { changed }. Delete's 409 carries the running quizzes' `titles`.
  bulk: (action, quizIds, tagIds = []) =>
    call(
      () => api.post('/api/quiz-library/bulk', { action, quiz_ids: quizIds, tag_ids: tagIds }),
      LIBRARY.actionFailed
    ),
  // The tags (SOT-3). Making a name the teacher already has, in any case, answers that tag; a rename to a taken name
  // is a 409 with the other tag's `existing_tag_id`, which a merge can then join.
  createTag: (name) => call(() => api.post('/api/quiz-tags', { name }), LIBRARY.actionFailed),
  renameTag: (tagId, name) => call(() => api.patch(tagPath(tagId), { name }), LIBRARY.actionFailed),
  mergeTag: (tagId, intoTagId) =>
    call(() => api.post(`${tagPath(tagId)}/merge`, { into_tag_id: intoTagId }), LIBRARY.actionFailed),
  deleteTag: (tagId) => call(() => api.delete(tagPath(tagId)), LIBRARY.actionFailed),
  // Make a copy: the existing duplicate route (a draft with the questions and settings, never results), then the
  // copy's classes when the teacher chose others, as the editor saves them (an audience, and its first class).
  copyQuiz: (quizId, name) =>
    call(() => api.post(`${quizPath(quizId)}/duplicate`, { new_title: name }), LIBRARY.actionFailed),
  setClasses: (quizId, audience) =>
    call(
      () => api.put(quizPath(quizId), { audience, class_id: audience?.class_ids?.[0] ?? null }),
      LIBRARY.actionFailed
    ),
  // POST /api/quizzes: a new quiz with its questions, made a draft, which accepts any content (SOT-11, SOT-1.3).
  createQuiz: (quiz) => call(() => api.post('/api/quizzes', quiz), LIBRARY.exampleFailed),
};

export const { bulk, createTag, renameTag, mergeTag, deleteTag, copyQuiz, setClasses, createQuiz } = invalidateAfter(
  commands,
  Object.keys(commands),
  cacheFamilies.quiz
);
