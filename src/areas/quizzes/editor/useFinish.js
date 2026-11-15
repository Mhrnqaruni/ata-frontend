// Finish editing (Phase 1.46 S5.3; SOT-1.3, SOT-13): everything unfinished as one list; otherwise the quiz saved, and
// a draft made ready through today's publish route, whose refusal comes back with the rule's own words.
// Area: quizzes

import { useCallback, useState } from 'react';
import { publishQuiz } from './api';
import { questionIndexIn, quizProblems } from './draft';

// The server's refusal as a checklist line, with Go to when it names a question.
const lineFrom = (error) => [{ text: error.message, index: questionIndexIn(error.message) }];

// Resolves to { ok } or { ok: false, problems }.
export default function useFinish(editor) {
  const [finishing, setFinishing] = useState(false);
  const { quiz, saveNow, dispatch } = editor;
  const finish = useCallback(async () => {
    const problems = quizProblems(quiz, { draft: false });
    if (problems.length) return { ok: false, problems };
    setFinishing(true);
    try {
      const saved = await saveNow();
      if (!saved.ok) return { ok: false, problems: saved.problems ?? lineFrom(saved.error) };
      if (quiz.status !== 'draft') return { ok: true };
      const data = await publishQuiz(saved.data?.id ?? quiz.id);
      dispatch({ type: 'status', status: data?.status || 'published' });
      return { ok: true };
    } catch (error) {
      return { ok: false, problems: lineFrom(error) };
    } finally {
      setFinishing(false);
    }
  }, [quiz, saveNow, dispatch]);
  return { finish, finishing };
}
