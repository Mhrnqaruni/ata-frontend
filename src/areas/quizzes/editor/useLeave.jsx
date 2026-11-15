// "Back to quizzes" (design.md §3.2): a draft saves its last changes first, a quiz that isn't a draft asks whether to
// save them, and an untitled one with questions (from ?start=import) warns; in-app windows, never the browser's.
// Area: quizzes

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmDialog from '../shared/ConfirmDialog';
import { LEAVE } from './words';

// Returns leave(), which goes back to the list when nothing would be lost, and the window to render beside the page.
export default function useLeave(editor) {
  const navigate = useNavigate();
  // What the window asks: 'failed' (a draft's save failed), 'ready' (unsaved changes) or 'untitled' (it can't save)
  const [asking, setAsking] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { quiz, changed, save, saveNow } = editor;
  const toList = useCallback(() => navigate('/quizzes'), [navigate]);

  // Saves, then leaves; or keeps the window open with the reason.
  const saveAndLeave = useCallback(async () => {
    setBusy(true);
    const result = await saveNow();
    setBusy(false);
    if (result.ok) return toList();
    setError(result.error?.message ?? result.problems.map((problem) => problem.text).join('. '));
    return undefined;
  }, [saveNow, toList]);

  const leave = useCallback(async () => {
    setError('');
    const draft = quiz.status === 'draft';
    if (!draft && changed) return setAsking('ready');
    if (draft && !quiz.title.trim() && quiz.questions.length) return setAsking('untitled');
    if (draft && quiz.title.trim() && (changed || save.phase === 'failed')) {
      const result = await saveNow();
      if (!result.ok) {
        setError(result.error?.message ?? '');
        return setAsking('failed');
      }
    }
    return toList();
  }, [quiz, changed, save.phase, saveNow, toList]);

  // Each question's words, its main button, and the other way out.
  const asks = {
    failed: { title: LEAVE.failedTitle, text: LEAVE.failedText, confirm: LEAVE.tryAgain, extra: LEAVE.leave },
    ready: { title: LEAVE.readyTitle, text: LEAVE.readyText, confirm: LEAVE.save, extra: LEAVE.dontSave },
    untitled: { title: LEAVE.untitledTitle, text: LEAVE.untitledText, confirm: LEAVE.leave },
  }[asking ?? 'ready'];
  const dialog = (
    <ConfirmDialog
      open={Boolean(asking)}
      title={asks.title}
      confirmLabel={asks.confirm}
      cancelLabel={LEAVE.stay}
      busy={busy}
      error={error}
      onConfirm={asking === 'untitled' ? toList : saveAndLeave}
      onCancel={() => setAsking(null)}
      extraAction={asks.extra ? { label: asks.extra, onClick: toList } : undefined}
    >
      {asks.text}
    </ConfirmDialog>
  );
  return { leave, dialog };
}
