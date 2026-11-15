// The quiz editor's calls (Phase 1.46, SOT-11 to SOT-13), all on today's routes (QA P2-2): load and save a quiz, its
// pictures and tags, Import with AI, the 'before' quizzes a post quiz can follow, and starting or sending a run.
// Area: quizzes

import api from '../../../services/api';
import tagService from '../../../services/tagService';
import { cacheFamilies, invalidateTeacher } from '../../../services/queryCache';

const MULTIPART = { headers: { 'Content-Type': 'multipart/form-data' } };
// The library's states, every one, so a lookup finds an archived quiz too.
const EVERY_STATE = ['draft', 'ready', 'live', 'homework', 'finished', 'archived'];

// A refused call as an Error that carries the server's own sentence and the status, so the page can show it where it
// belongs: a rule's message in the checklist, a start's in the Start window. A field error keeps its message.
export function refusal(error, fallback) {
  const detail = error?.response?.data?.detail;
  const field = Array.isArray(detail) ? String(detail[0]?.msg ?? '').replace(/^Value error, /, '') : '';
  const text = typeof detail === 'string' ? detail : field;
  return Object.assign(new Error(text || fallback), {
    status: error?.response?.status ?? null,
    reference: error?.reference,
  });
}

async function call(request, fallback) {
  try {
    return (await request()).data;
  } catch (error) {
    throw refusal(error, fallback);
  }
}

export const getQuiz = (quizId, { signal } = {}) =>
  call(() => api.get(`/api/quizzes/${quizId}`, { signal }), "Couldn't open the quiz. Check your connection.");

// Creates the quiz on its first save, then saves it whole: PUT replaces its questions (SOT-11's autosave route).
export async function saveQuiz(quizId, body) {
  const data = await call(
    () => (quizId ? api.put(`/api/quizzes/${quizId}`, body) : api.post('/api/quizzes', body)),
    "Couldn't save. Check your connection, then try again."
  );
  void invalidateTeacher(['quizzes']);
  return data;
}

export async function publishQuiz(quizId) {
  const data = await call(() => api.post(`/api/quizzes/${quizId}/publish`), "Couldn't finish the quiz. Try again.");
  void invalidateTeacher(cacheFamilies.quiz);
  return data;
}

// Stores a question's picture against its saved id; the answer carries the picture's address.
export function uploadPicture(questionId, file) {
  const form = new FormData();
  form.append('file', file);
  return call(
    () => api.post(`/api/quizzes/questions/${questionId}/upload-image`, form, MULTIPART),
    "Couldn't add the picture. Try again."
  );
}

// Import with AI: the file or pasted text in, questions out. It uses AI, so only the teacher's own press calls it.
export const readWithAI = (form) =>
  call(() => api.post('/api/quizzes/ai/parse', form, MULTIPART), "Couldn't read that. Try again in a minute.");

// The finished 'before' quizzes a post quiz can follow: the same mode, and the same class when it has one.
export const beforeQuizzes = ({ mode, classId }) =>
  call(
    () =>
      api.get('/api/quizzes/finished-pre-quizzes', {
        params: { mode, ...(classId ? { class_id: classId } : { include_all_classes: true }) },
      }),
    "Couldn't load your 'before' quizzes."
  );

// The library's items, newest used first: their classes are the chooser's Recent (SOT-11).
export const recentQuizzes = () =>
  call(
    () => api.get('/api/quiz-library', { params: { sort: 'last_used', limit: 20 } }),
    "Couldn't load your recent classes."
  ).then((data) => data.items);

// How many pupils a choice of classes and groups has, as the server works it out.
export const countPupils = (selection) => tagService.preview(selection).then((data) => data.count ?? 0);

export const listTags = () => call(() => api.get('/api/quiz-tags'), "Couldn't load your tags.");

export const makeTag = (name) => call(() => api.post('/api/quiz-tags', { name }), "Couldn't make the tag.");

export async function setQuizTags(quizId, tagIds) {
  const data = await call(
    () => api.put(`/api/quizzes/${quizId}/tags`, { tag_ids: tagIds }),
    "Couldn't save the tags. Try again."
  );
  void invalidateTeacher(['quizzes']);
  return data.tags;
}

// A quiz's tags. The library is the one read that has them, so this finds the quiz there by its saved title.
export async function tagsOf(quizId, title) {
  const data = await call(
    () =>
      api.get('/api/quiz-library', {
        params: { q: title, state: EVERY_STATE, limit: 100 },
        paramsSerializer: { indexes: null },
      }),
    "Couldn't load the quiz's tags."
  );
  const item = data.items.find((each) => each.id === quizId);
  if (!item) throw new Error("Couldn't load the quiz's tags.");
  return item.tags;
}

// A live run for the classes chosen (SOT-6), or the quiz's own when audience is null. The pace is applied after,
// with the quiz's cooldown, as the lobby does (SOT-9; QA P3-1).
export async function createLiveRun(quizId, audience) {
  const data = await call(
    () => api.post('/api/quiz-sessions', { quiz_id: quizId, ...(audience ? { audience } : {}) }),
    "Couldn't start the quiz. Try again."
  );
  void invalidateTeacher(cacheFamilies.quiz);
  return data;
}

export const setPace = (runId, autoAdvance, cooldownSeconds) =>
  call(
    () =>
      api.post(`/api/quiz-sessions/${runId}/toggle-auto-advance`, null, {
        params: { enabled: autoAdvance, cooldown_seconds: cooldownSeconds },
      }),
    "Couldn't set the pace."
  );

// A homework run is made as a draft, then started; the Send window retries the start on the same run (SOT-6, P3-12).
export async function createHomework(body) {
  const data = await call(() => api.post('/api/quiz-sp-sessions', body), "Couldn't send the homework. Try again.");
  void invalidateTeacher(cacheFamilies.quiz);
  return data;
}

export async function startHomework(runId) {
  const data = await call(
    () => api.post(`/api/quiz-sp-sessions/${runId}/start`),
    "Couldn't start the homework. Try again"
  );
  void invalidateTeacher(cacheFamilies.quiz);
  return data;
}
