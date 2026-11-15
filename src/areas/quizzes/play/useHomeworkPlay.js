// A pupil's homework (SOT-10; design.md §3.12; SP6–SP9): each answer saved as it's chosen, moving between questions,
// and handing in. Answers already saved earlier (joining again) count as answered.
// Area: quizzes

import { useCallback, useEffect, useRef, useState } from 'react';
import { goToQuestion, handIn as handInCall, saveHomeworkAnswer } from './api';

// The server's words for homework that can't take answers any more: closed by the teacher or past its due time.
export const CLOSED = /not accepting|deadline has passed|after deadline|already submitted/i;

const filled = (value) => value !== null && value !== undefined && !(typeof value === 'string' && value.trim() === '');

// run: the join answer. Returns the pupil's place and what they can do.
export function useHomeworkPlay(run) {
  const progress = run.current_progress || {};
  const [index, setIndex] = useState(
    Math.min(progress.current_question_index || 0, Math.max(0, run.questions.length - 1))
  );
  const [answers, setAnswers] = useState({});
  const [saved, setSaved] = useState(() =>
    Object.fromEntries((progress.completed_question_ids || []).map((id) => [String(id), 'earlier']))
  );
  const [handedIn, setHandedIn] = useState(
    progress.status === 'submitted' ? { submitted_at: progress.submitted_at } : null
  );
  const [closed, setClosed] = useState(false);
  const latest = useRef({ answers, saved });
  useEffect(() => {
    latest.current = { answers, saved };
  });

  const save = useCallback(
    async (question, value) => {
      const id = String(question.id);
      if (!filled(value)) return;
      setSaved((all) => ({ ...all, [id]: 'saving' }));
      try {
        await saveHomeworkAnswer(
          run.session_id,
          run.student_token,
          question.id,
          typeof value === 'string' ? value.trim() : value
        );
        setSaved((all) => ({ ...all, [id]: 'saved' }));
      } catch (error) {
        if (CLOSED.test(error.message)) setClosed(true);
        setSaved((all) => ({ ...all, [id]: 'failed' }));
      }
    },
    [run.session_id, run.student_token]
  );

  // A choice saves at once; typing saves when the pupil moves on (or taps Save again after a failure).
  const choose = (question, value) => {
    setAnswers((all) => ({ ...all, [String(question.id)]: value }));
    if (question.question_type !== 'short_answer') save(question, value);
    else setSaved((all) => ({ ...all, [String(question.id)]: 'typing' }));
  };

  // Saves a typed answer that hasn't gone yet, then moves; the server's place follows, quietly.
  const go = async (next) => {
    const question = run.questions[index];
    const id = String(question?.id);
    if (question && ['typing', 'failed'].includes(latest.current.saved[id]))
      await save(question, latest.current.answers[id]);
    if (next >= 0 && next < run.questions.length) {
      setIndex(next);
      goToQuestion(run.session_id, run.student_token, next).catch(() => {});
    }
  };

  const handIn = async () => {
    const result = await handInCall(run.session_id, run.student_token);
    setHandedIn(result);
    return result;
  };

  const answered = (question) =>
    ['saved', 'earlier'].includes(saved[String(question.id)]) || filled(answers[String(question.id)]);
  return { index, setIndex: go, answers, saved, choose, save, handIn, handedIn, closed, setClosed, answered };
}
