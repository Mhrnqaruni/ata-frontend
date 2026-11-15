// A pupil's live quiz as its socket tells it (SOT-9; design.md §3.12): waiting, a question and its clock, the closed
// question with right or wrong, and the end. Plus each answer in its words, the points line and the end's counts.
// Area: quizzes

import { questionEndsAt } from '../live/liveClock';
import { PLAY } from './words';

export const initialPlay = () => ({
  phase: 'waiting', // waiting | question | closed | finished
  question: null, // { id, text, type, options, points, order_index, time_limit_seconds, media_url, match_level }
  endsAt: null, // when answering closes, on this device's clock
  movesOnAt: null, // moving on by itself: when the next question starts
  feedback: null, // right or wrong for the closed question, when the teacher shows it
  answeredId: null, // the question the server says this pupil answered (after getting back in)
  regrade: null, // the question whose AI marking just finished
  leaderboard: [],
  end: null, // { showResults, showLeaderboard }
});

const same = (a, b) => Boolean(a && b) && String(a.id) === String(b.id) && a.order_index === b.order_index;

// The cooldown's your_answer as feedback: pending while a short answer waits for its AI mark (a poll is never marked).
function feedbackFrom(answer, question) {
  if (!answer) return null;
  const pending = question?.type === 'short_answer' && answer.is_correct === null && !answer.did_not_answer;
  return { ...answer, pending };
}

// One socket message (or { type: 'feedback', feedback } from a fresh mark), with the device's time it arrived.
export function playReducer(state, { message, now = Date.now() }) {
  switch (message?.type) {
    case 'question_started': {
      const again = same(state.question, message.question);
      return {
        ...state,
        phase: state.phase === 'finished' ? 'finished' : 'question',
        question: message.question,
        endsAt: questionEndsAt(message, now),
        movesOnAt: again ? state.movesOnAt : null,
        feedback: again ? state.feedback : null,
        answeredId: again ? state.answeredId : null,
      };
    }
    case 'question_ended':
    case 'cooldown_started': {
      if (!state.question || state.phase === 'finished') return state;
      const auto = Boolean(message.auto_advance_enabled);
      const wait = Math.max(0, Number(message.cooldown_seconds) || 0) * 1000;
      const feedback =
        message.type === 'cooldown_started' ? feedbackFrom(message.your_answer, state.question) : state.feedback;
      return { ...state, phase: 'closed', movesOnAt: auto ? now + wait : null, feedback };
    }
    case 'answer_submitted':
      return message.result?.question_id ? { ...state, answeredId: String(message.result.question_id) } : state;
    case 'ai_grading_complete':
      return { ...state, regrade: message.question_id ? String(message.question_id) : null };
    case 'feedback':
      return { ...state, feedback: feedbackFrom(message.feedback, state.question), regrade: null };
    case 'leaderboard_update':
      return { ...state, leaderboard: Array.isArray(message.leaderboard) ? message.leaderboard : [] };
    case 'session_ended':
      return {
        ...state,
        phase: 'finished',
        movesOnAt: null,
        end: { showResults: message.show_result_feedback ?? true, showLeaderboard: Boolean(message.show_leaderboard) },
      };
    default:
      return state;
  }
}

// An answer in its words: the option's text, True or False, or what was typed.
export function answerWords(question, value) {
  if (value === null || value === undefined || value === '') return '';
  if (question?.type === 'true_false') return value === true || String(value) === 'true' ? 'True' : 'False';
  if (question?.type === 'multiple_choice' || question?.type === 'poll') return question.options?.[Number(value)] ?? '';
  return String(value);
}

// The right answer in words, from the server's correct_answer list: the first accepted answer for a short answer.
export function rightWords(question, correct) {
  const list = Array.isArray(correct) ? correct : correct == null ? [] : [correct];
  return list.length ? answerWords(question, list[0]) : '';
}

// Whether an answer is ready to send: a choice made, or something typed.
export const ready = (question, value) =>
  question?.type === 'short_answer'
    ? typeof value === 'string' && value.trim() !== ''
    : value !== null && value !== undefined;

// A typed answer at Close or Same meaning can get part points (C10's match_level; a level not sent is Same meaning, as
// the server reads it, C1). Exact gives full points or none.
export const partPointsPossible = (question) =>
  question?.type === 'short_answer' && (question.match_level ?? 'meaning') !== 'exact';

// The question's points line (design.md §3.5): "10 points", "Up to 10 points" where part points are possible, or "A
// poll · no points". None when the run hides the score, or the points aren't known: a missing number is never 0.
export function pointsLine(question, { scoreShown = true } = {}) {
  if (question?.type === 'poll') return PLAY.poll;
  if (!scoreShown || !Number.isFinite(question?.points)) return null;
  return partPointsPossible(question) ? PLAY.upTo(question.points) : PLAY.points(question.points);
}

// The hint before a choice: "Type your answer, then Send." on a typed question, else "Tap an answer, then Send.".
export const sendHint = (question) => (question?.type === 'short_answer' ? PLAY.typeFirst : PLAY.chooseFirst);

// What a closed live question says (design.md §3.5): { tone, title, line }. tone is right, wrong, waiting or plain.
// feedback: the cooldown's your_answer (null when the teacher hides right or wrong); answered: this pupil's went in.
export function closedOutcome(question, feedback, answered) {
  if (feedback?.did_not_answer || (!feedback && !answered)) return { tone: 'plain', title: PLAY.noAnswerSent };
  if (!feedback || question?.type === 'poll') return { tone: 'plain', title: PLAY.answerSent };
  if (feedback.pending) return { tone: 'waiting', title: PLAY.checking };
  const right = feedback.is_correct === true;
  const typed = question?.type === 'short_answer';
  const accepted = rightWords(question, feedback.correct_answer);
  const wrongLine = accepted ? (typed ? PLAY.accepted(accepted) : PLAY.answerWas(accepted)) : null;
  const points = feedback.points_earned;
  if (partPointsPossible(question) && Number.isFinite(points) && Number.isFinite(question.points)) {
    return right
      ? { tone: 'right', title: PLAY.rightPoints(points, question.points) }
      : { tone: 'wrong', title: PLAY.notRightPoints(points, question.points), line: wrongLine };
  }
  if (right)
    return { tone: 'right', title: PLAY.right, line: Number.isFinite(points) ? PLAY.pointsEarned(points) : null };
  return { tone: 'wrong', title: PLAY.notQuite, line: wrongLine };
}

// A pupil's answer as a list, with a blank as none: [] (live), {} (homework) or null, and an object's own value.
export function givenAnswers(answer) {
  if (answer === null || answer === undefined || answer === '') return [];
  if (Array.isArray(answer)) return answer.filter((value) => value !== null && value !== undefined && value !== '');
  if (typeof answer === 'object') {
    const inner = answer.text ?? answer.selected_value ?? answer.selected_index;
    return inner === undefined ? [] : givenAnswers([inner]);
  }
  return [answer];
}

// The end's "2 right · 1 partly right · 1 no answer", from the pupil's review: partly right is some points but not
// all, right is the rest marked right, and no answer is a question left blank. Polls and answers waiting don't count.
export function answerKinds(reviews = []) {
  const kinds = { right: 0, partly: 0, wrong: 0, blank: 0 };
  for (const item of reviews) {
    if (item.question_type === 'poll' || item.marking_status === 'pending') continue;
    const points = item.points_earned;
    const max = item.max_points;
    if (!givenAnswers(item.student_answer).length) kinds.blank += 1;
    else if (Number.isFinite(points) && Number.isFinite(max) && points > 0 && points < max) kinds.partly += 1;
    else if (item.is_correct) kinds.right += 1;
    else kinds.wrong += 1;
  }
  return kinds;
}

// The top 5's places: only pupils above 0 points get one (Phase 1.47 R4), whatever the server still ranks. The
// server's shared places stay (1, 1, 3).
export const placed = (leaderboard = []) => leaderboard.filter((entry) => Number(entry.score) > 0).slice(0, 5);
