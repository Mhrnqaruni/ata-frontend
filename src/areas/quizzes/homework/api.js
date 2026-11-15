// The teacher's homework page calls (SOT-10): the run, its summary (handed in, working, not started, each pupil),
// who has opened it with how far they got, one pupil's answers, and sending or closing it.
// Area: quizzes

import api, { apiError } from '../../../services/api';
import { cacheFamilies, invalidateTeacher } from '../../../services/queryCache';

const run = (sessionId, path = '') => `/api/quiz-sp-sessions/${encodeURIComponent(sessionId)}${path}`;

async function read(path, fallback, config) {
  try {
    return (await api.get(path, config)).data;
  } catch (error) {
    throw Object.assign(apiError(error, fallback), { status: error?.response?.status ?? null });
  }
}

async function command(path, fallback) {
  try {
    const { data } = await api.post(path);
    void invalidateTeacher(cacheFamilies.quiz);
    return data;
  } catch (error) {
    throw Object.assign(apiError(error, fallback), { status: error?.response?.status ?? null });
  }
}

// The run: its code, state (draft, active, completed), due date and settings.
export const getHomework = (sessionId, { signal } = {}) =>
  read(run(sessionId), "Couldn't load this homework.", { signal });

// The run's summary (SOT-7): handed_in, working, not_started, average, max_points, questions, pupils (each with
// status done, working, not_started or absent, and score) and not_on_class_list.
export const getSummary = (quizId, sessionId, { signal } = {}) =>
  read(
    `/api/quizzes/${encodeURIComponent(quizId)}/runs/${encodeURIComponent(sessionId)}/summary`,
    "Couldn't load who has handed in.",
    { signal }
  );

// Everyone who opened it: how far each got (progress_percentage), their time and their stored id, for their answers.
export const getProgress = (sessionId, { signal } = {}) =>
  read(run(sessionId, '/participants'), "Couldn't load who has handed in.", { signal });

// A quiz's runs, newest first: the page takes this run's close time from it.
export const getRuns = (quizId, { signal } = {}) =>
  read(`/api/quizzes/${encodeURIComponent(quizId)}/runs`, "Couldn't load the quiz's runs.", { signal });

// The quiz with its questions: their options turn a pupil's choice into words.
export const getQuiz = (quizId, { signal } = {}) =>
  read(`/api/quizzes/${encodeURIComponent(quizId)}`, "Couldn't load the quiz.", { signal });

// One pupil's answers, question by question (the stored id, as the progress read gives it).
export const getPupilAnswers = (sessionId, studentId, { signal } = {}) =>
  read(run(sessionId, `/student/${encodeURIComponent(studentId)}/report`), "Couldn't load these answers.", { signal });

// Send a run that wasn't sent (its start), or close it: pupils' work so far is handed in, and nobody can open it.
export const sendHomework = (sessionId) => command(run(sessionId, '/start'), "Couldn't send the homework.");
export const closeHomework = (sessionId) => command(run(sessionId, '/end'), "Couldn't close the homework.");
