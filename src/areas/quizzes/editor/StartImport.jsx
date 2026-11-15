// "Make one from a worksheet", the empty library's start (design.md §3.1): /quizzes/new?start=import opens Import with
// AI once, over step 1; the address then drops the request, so a reload doesn't open it again.
// Area: quizzes

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSnackbar } from '../../../hooks/useSnackbar';
import ImportWithAI from './ImportWithAI';
import { IMPORT } from './words';

// The address without its ?start= request, keeping anything else in it.
function withoutStart() {
  const address = new URL(window.location.href);
  address.searchParams.delete('start');
  return `${address.pathname}${address.search}${address.hash}`;
}

// dispatch: the editor's, which adds the questions read to the quiz.
export default function StartImport({ dispatch }) {
  const [params] = useSearchParams();
  const [open, setOpen] = useState(() => params.get('start') === 'import');
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (open) window.history.replaceState(window.history.state, '', withoutStart());
  }, [open]);

  return (
    <ImportWithAI
      open={open}
      onClose={() => setOpen(false)}
      onAdd={(questions) => {
        dispatch({ type: 'append', questions });
        setOpen(false);
        showSnackbar(IMPORT.added(questions.length), 'success');
      }}
    />
  );
}
