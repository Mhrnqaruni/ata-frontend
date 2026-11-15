// What a quiz row's Open and its ⋯ menu's run items do (design.md §3.10): Open goes to the running quiz's own page,
// editing to the editor, Results to the results, and Run again…, Start… or Send… open the Start window to run it.
// Area: quizzes

import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from '../../../hooks/useSnackbar';
import { getQuiz } from '../editor/api';
import { quizFrom } from '../editor/editorState';
import { runPath } from './rows';

// Returns act(action, quiz) for the rows and their menus, and startWindow, the props of the editor's StartWindow: it
// needs the quiz as the editor keeps it (its settings, classes and before-and-after phase, which a library row doesn't
// carry), so the quiz is read afresh. Start now then opens the live page, and Send the homework page with Share open.
export function useQuizOpeners() {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();
  const [windowState, setWindowState] = useState({ open: false, quiz: null }); // the quiz stays while it closes
  const reading = useRef(false); // one at a time, even on a double click

  const act = useCallback(
    async (action, quiz) => {
      if (action === 'edit') return navigate(`/quizzes/${quiz.id}/edit`);
      if (action === 'results') return navigate(`/quizzes/${quiz.id}/results`);
      if (action === 'open') return navigate(runPath(quiz.open_run));
      if (action !== 'start' || reading.current) return undefined;
      reading.current = true;
      try {
        setWindowState({ open: true, quiz: quizFrom(await getQuiz(quiz.id)) });
      } catch (error) {
        showSnackbar(error.message, 'error', error.reference);
      } finally {
        reading.current = false;
      }
      return undefined;
    },
    [navigate, showSnackbar]
  );
  const startWindow = { ...windowState, onClose: () => setWindowState((last) => ({ ...last, open: false })) };
  return { act, startWindow };
}
