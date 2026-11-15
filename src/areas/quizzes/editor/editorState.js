// The quiz editor's state (Phase 1.46, SOT-11 to SOT-13): the quiz as the teacher edits it, changed one action at a
// time, with a count of changes so the autosave knows what's saved. Pure, so it's tested without a page.
// Area: quizzes

import { blankQuestion, editableQuestions, MAX_QUESTIONS, moveItem, savedQuestions } from './questionModel';

// A new quiz's settings: the keys today's pages read, with the leaderboard off (Q5) and both homework tiles on.
export const DEFAULT_SETTINGS = {
  mode: 'live',
  shuffle_questions: false,
  shuffle_options: false,
  show_correct_answers: true,
  allow_review: true,
  show_correct_answer_during_cooldown: true,
  show_result_feedback_to_students: true,
  leaderboard: 'off',
  show_leaderboard_to_students: false,
  show_final_score_to_students: true,
  show_answer_feedback: true,
};

// The quiz's mode, 'live' or 'self_paced', whatever older pages saved.
export const modeOf = (settings) =>
  ['self_paced', 'self-paced', 'sp'].includes(settings?.mode) ? 'self_paced' : 'live';

export function newQuiz() {
  return {
    id: null,
    status: 'draft',
    title: '',
    description: '',
    audience: null,
    serverAudience: null,
    classId: null,
    quizPhase: 'normal',
    linkedQuizId: null,
    settings: { ...DEFAULT_SETTINGS },
    questions: [],
  };
}

// A quiz's audience as the server keeps it. An older quiz with only a class gets that class as its audience.
export function audienceFrom(data) {
  if (data.audience && (data.audience.class_ids?.length || data.audience.tag_ids?.length))
    return {
      class_ids: data.audience.class_ids || [],
      tag_ids: data.audience.tag_ids || [],
      mode: data.audience.mode || 'union',
    };
  return data.class_id ? { class_ids: [data.class_id], tag_ids: [], mode: 'union' } : null;
}

// A quiz from GET /api/quizzes/:id as the editor keeps it, with the audience the server has, which a save can't empty.
export function quizFrom(data) {
  const audience = audienceFrom(data);
  return {
    id: data.id,
    status: data.status || 'draft',
    title: data.title || '',
    description: data.description || '',
    audience,
    serverAudience: audience,
    classId: data.class_id || null,
    quizPhase: data.quiz_phase || 'normal',
    linkedQuizId: data.linked_quiz_id || null,
    settings: { ...(data.settings || {}), mode: modeOf(data.settings) },
    questions: editableQuestions(data.questions),
  };
}

// The quiz as POST and PUT /api/quizzes take it. The class is the audience's first, as the builder has always saved
// it. PUT leaves out a null field, so an emptied description goes as ''.
export function payloadOf(quiz) {
  return {
    title: quiz.title.trim(),
    description: (quiz.description || '').trim(),
    quiz_phase: quiz.quizPhase,
    linked_quiz_id: quiz.quizPhase === 'post' ? quiz.linkedQuizId : null,
    settings: quiz.settings,
    audience: quiz.audience,
    class_id: quiz.quizPhase === 'post' ? quiz.classId : (quiz.audience?.class_ids?.[0] ?? null),
    questions: savedQuestions(quiz.questions),
  };
}

// Each question's new id after a save, by its key: the saved questions come back in the order they were sent.
export function idsByKey(keys, savedQuestionsBack) {
  const back = [...(savedQuestionsBack || [])].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  return Object.fromEntries(keys.flatMap((key, index) => (back[index]?.id ? [[key, back[index].id]] : [])));
}

export const initialState = (quiz = null) => ({ quiz, version: 0, savedVersion: 0 });

const changed = (state, quiz) => ({ ...state, quiz, version: state.version + 1 });
const withQuestions = (state, questions) => changed(state, { ...state.quiz, questions });
const indexOf = (state, key) => state.quiz.questions.findIndex((question) => question.key === key);

// One change to the quiz. Every action but load, saved and status counts as a change to save.
export function reduce(state, action) {
  const questions = state.quiz?.questions ?? [];
  switch (action.type) {
    case 'load':
      return initialState(action.quiz);
    case 'set':
      return changed(state, { ...state.quiz, ...action.fields });
    case 'settings':
      return changed(state, { ...state.quiz, settings: { ...state.quiz.settings, ...action.patch } });
    case 'question': {
      // patch: the fields that change, or a function from the question as it is now to the new one.
      const at = indexOf(state, action.key);
      if (at < 0) return state;
      const updated =
        typeof action.patch === 'function' ? action.patch(questions[at]) : { ...questions[at], ...action.patch };
      const next = withQuestions(
        state,
        questions.map((question, i) => (i === at ? updated : question))
      );
      // A change the server already has, such as a picture it stored, isn't one to save again.
      return action.alreadySaved && state.version === state.savedVersion
        ? { ...next, savedVersion: next.version }
        : next;
    }
    case 'add': {
      if (questions.length >= MAX_QUESTIONS) return state;
      const question = action.question ?? blankQuestion(action.questionType);
      const at = action.at ?? questions.length;
      return withQuestions(state, [...questions.slice(0, at), question, ...questions.slice(at)]);
    }
    case 'remove':
      return withQuestions(
        state,
        questions.filter((question) => question.key !== action.key)
      );
    case 'move':
      return withQuestions(state, moveItem(questions, action.from, action.to));
    case 'append': {
      // Imported questions replace a lone untouched question, and stop at the quiz's limit.
      const lone = questions.length === 1 && !questions[0].question_text?.trim() && !questions[0].id;
      const kept = lone ? [] : questions;
      return withQuestions(state, [...kept, ...action.questions].slice(0, MAX_QUESTIONS));
    }
    case 'every':
      return withQuestions(
        state,
        questions.map((question) =>
          action.field === 'points' && question.question_type === 'poll'
            ? question
            : { ...question, [action.field]: action.value }
        )
      );
    case 'saved': {
      const quiz = {
        ...state.quiz,
        id: action.id ?? state.quiz.id,
        serverAudience: action.audience === undefined ? state.quiz.serverAudience : action.audience,
        questions: questions.map((question) =>
          action.ids?.[question.key] ? { ...question, id: action.ids[question.key] } : question
        ),
      };
      return { ...state, quiz, savedVersion: Math.max(state.savedVersion, action.version) };
    }
    case 'status':
      return { ...state, quiz: { ...state.quiz, status: action.status } };
    default:
      return state;
  }
}
