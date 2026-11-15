// The pupils' calls, with no sign-in (SOT-9, SOT-10, SOT-10a): joining a live quiz or homework, sending a live answer,
// saving homework answers, handing in, and reading their own answers back. Each refusal carries the server's words.
// Area: quizzes

import api, { apiError } from '../../../services/api';

const refused = (error, fallback) =>
  Object.assign(apiError(error, fallback), { status: error?.response?.status ?? null, offline: !error?.response });

async function call(method, path, body, headers, fallback) {
  try {
    const { data } = await api.request({ method, url: path, data: body, headers });
    return data;
  } catch (error) {
    throw refused(error, fallback);
  }
}

const live = (sessionId, path) => `/api/quiz-sessions/${encodeURIComponent(sessionId)}${path}`;
const homework = (sessionId, path) => `/api/quiz-sp-sessions/${encodeURIComponent(sessionId)}${path}`;
const guest = (token) => (token ? { 'X-Guest-Token': token } : undefined);
const pupil = (token) => ({ 'X-Student-Token': token });

// --- live ---
// { session, participant, guest_token, on_class_list }. A guest token already held gets the same place back.
export const joinLive = ({ code, name, number, guestToken }) =>
  call(
    'post',
    '/api/quiz-sessions/join',
    { room_code: code, guest_name: name, student_id: number },
    guest(guestToken),
    "Couldn't join the quiz. Check the code."
  );

// One answer, as a one-item list; the time is only shown, the server times each answer itself (SOT-1.1).
export const sendLiveAnswer = (sessionId, guestToken, { questionId, answer, timeMs }) =>
  call(
    'post',
    live(sessionId, '/submit-answer'),
    { question_id: questionId, answer: [answer], time_taken_ms: timeMs },
    guest(guestToken),
    "Couldn't send your answer."
  );

// This pupil's marked answer to one question, after its AI marking finished.
export const getLiveResponse = (sessionId, guestToken, questionId) =>
  call(
    'get',
    live(sessionId, `/my-response/${encodeURIComponent(questionId)}`),
    undefined,
    guest(guestToken),
    "Couldn't load your result."
  );

export const getLiveReview = (sessionId, guestToken) =>
  call('get', live(sessionId, '/my-answers'), undefined, guest(guestToken), "Couldn't load your answers.");

// --- homework ---
// { session_id, student_token, quiz_title, total_questions, deadline, settings, current_progress, questions,
// on_class_list }. Joining again with the same number gets the same work back.
export const joinHomework = ({ code, name, number }) =>
  call(
    'post',
    '/api/quiz-sp-sessions/join',
    { access_code: code, student_id: number, guest_name: name },
    undefined,
    "Couldn't open the homework. Check the code."
  );

// Saves one answer: with feedback off the reply is only { question_id, saved } (SOT-10a).
export const saveHomeworkAnswer = (sessionId, token, questionId, answer) =>
  call(
    'post',
    homework(sessionId, '/answer'),
    { question_id: questionId, answer, time_taken_ms: null },
    pupil(token),
    "Couldn't save your answer."
  );

export const goToQuestion = (sessionId, token, index) =>
  call('post', homework(sessionId, '/navigate'), { question_index: index }, pupil(token), "Couldn't move on.");

// { final_score, total_possible_points, percentage, submitted_at }; the score is null when the teacher hides it.
export const handIn = (sessionId, token) =>
  call('post', homework(sessionId, '/submit'), { confirm: true }, pupil(token), "Couldn't hand it in. Try again.");

// The review after handing in; 403 "Your teacher will share the answers later" when feedback is off.
export const getHomeworkReview = (sessionId, token) =>
  call('get', homework(sessionId, '/my-answers'), undefined, pupil(token), "Couldn't load your answers.");
