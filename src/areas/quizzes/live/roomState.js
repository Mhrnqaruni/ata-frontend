// The teacher's live room as its socket tells it (SOT-9; design.md §3.7): the run's state, the open question and its
// clock, who has answered it, the pace and the leaderboard, and the page's one main action.
// Area: quizzes

import { questionEndsAt } from './liveClock';

export const FINISHED = ['completed', 'cancelled'];

// The room before the socket speaks, from the run as the page loaded it.
export function initialRoom(run) {
  const settings = run?.config_snapshot || {};
  return {
    status: run?.status ?? 'waiting',
    question: null, // the socket's question: { id, text, type, options, points, order_index, time_limit_seconds }
    endsAt: null, // when answering closes, on this device's clock
    closed: false, // answering has closed, so the answers show
    movesOnAt: null, // moving on by itself: when the next question starts, on this device's clock
    answered: { count: 0, ids: [], total: null }, // the server's count, the pupils known to have answered, who's in
    pace: { auto: Boolean(settings.auto_advance_enabled), cooldown: settings.cooldown_seconds ?? 10 },
    leaderboard: [],
    marksPending: false, // the closed question's typed answers wait for the AI's marks (C2's marks_pending)
    marksRound: 0, // how many times those marks arrived for this question: the counts are read again each time
  };
}

const sameQuestion = (a, b) => Boolean(a && b) && String(a.id) === String(b.id) && a.order_index === b.order_index;

// One socket message, with the device's time it arrived, applied to the room.
export function roomReducer(room, { message, now = Date.now() }) {
  switch (message?.type) {
    case 'session_started':
      return room.status === 'waiting' ? { ...room, status: 'active' } : room;
    case 'question_started': {
      // The same question comes again after a reconnect: its clock is refreshed, and who answered is kept.
      const same = sameQuestion(room.question, message.question);
      return {
        ...room,
        status: FINISHED.includes(room.status) ? room.status : 'active',
        question: message.question,
        endsAt: questionEndsAt(message, now),
        closed: same && room.closed,
        movesOnAt: same ? room.movesOnAt : null,
        answered: same ? room.answered : { count: 0, ids: [], total: room.answered.total },
        marksPending: same && room.marksPending,
        marksRound: same ? room.marksRound : 0,
      };
    }
    case 'question_ended':
    case 'cooldown_started': {
      const index = message.question_index;
      if (!room.question || (Number.isInteger(index) && index !== room.question.order_index)) return room;
      const auto = Boolean(message.auto_advance_enabled);
      const wait = Math.max(0, Number(message.cooldown_seconds) || 0) * 1000;
      // The server sends both again when the typed answers' marks arrive (marks_pending is in its key, C2).
      const marksPending = Boolean(message.marks_pending);
      return {
        ...room,
        closed: true,
        endsAt: Math.min(room.endsAt ?? now, now),
        movesOnAt: auto ? now + wait : null,
        pace: { ...room.pace, auto },
        marksPending,
        marksRound: room.marksPending && !marksPending ? room.marksRound + 1 : room.marksRound,
      };
    }
    case 'participant_answered': {
      const id = String(message.participant_id);
      if (!room.question || String(message.question_id) !== String(room.question.id) || room.answered.ids.includes(id))
        return room;
      const ids = [...room.answered.ids, id];
      return { ...room, answered: { ...room.answered, ids, count: Math.max(room.answered.count, ids.length) } };
    }
    case 'stats_update': {
      // Once answering closes, the server adds an empty answer for each pupil who gave none, so the count stops here.
      const total = Number.isFinite(message.total_participants) ? message.total_participants : room.answered.total;
      if (room.closed) return { ...room, answered: { ...room.answered, total } };
      const count = Number.isFinite(message.answers_received) ? message.answers_received : room.answered.count;
      return { ...room, answered: { ...room.answered, count: Math.max(count, room.answered.ids.length), total } };
    }
    case 'auto_advance_updated':
      return {
        ...room,
        pace: { auto: Boolean(message.enabled), cooldown: message.cooldown_seconds ?? room.pace.cooldown },
      };
    case 'leaderboard_update':
      return { ...room, leaderboard: Array.isArray(message.leaderboard) ? message.leaderboard : [] };
    case 'session_ended':
      return { ...room, status: message.final_status || 'completed', closed: true, movesOnAt: null };
    default:
      return room;
  }
}

// The page's one main action (design.md §3.7): 'start' before the quiz, 'reveal' while a question is open (Show
// answers), then 'next', or 'finish' on the last question. 'starting' is the moment between Start and question 1.
// lastClosed: the server said the last question is already closed (Show answers answered 422 there, Q13) before the
// socket did, so it offers Finish. A timed run has none while a question is open, so nothing big ends it early
// (Phase 1.47 R2): timedChoice() gives its small control instead.
export function mainAction(room, questionCount, { lastClosed = false } = {}) {
  if (room.status === 'waiting') return 'start';
  if (room.status !== 'active') return null;
  if (!room.question) return 'starting';
  const last = room.question.order_index >= questionCount - 1;
  if (!room.closed) {
    if (last && lastClosed) return 'finish';
    return room.pace.auto ? null : 'reveal';
  }
  return last ? 'finish' : 'next';
}

// Every pupil in the room has answered the open question (SOT-10 R2): the server's count reaches its count of active
// pupils, and the page's names agree. Never in an empty room. split: answeredSplit()'s.
export function everyoneAnswered(room, split) {
  if (room.status !== 'active' || !room.question || room.closed) return false;
  const { count, total } = room.answered;
  const serverAgrees = total == null || count >= total;
  return split.total > 0 && split.count >= split.total && serverAgrees;
}

// A timed run's small control while its question is open (design.md §3.2): 'early' is "Show answers now", a quiet text
// button; once everyone has answered, 'everyone' is "Everyone's answered · Move on" (or "· Finish" on the last
// question). Both close the question now, and the pause and the move on follow, as when its time is up.
export function timedChoice(room, everyone) {
  if (room.status !== 'active' || !room.question || room.closed || !room.pace.auto) return null;
  return everyone ? 'everyone' : 'early';
}
