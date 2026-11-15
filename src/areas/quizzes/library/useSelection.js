// The quiz list's ticked rows (design.md §3.1, L8): kept while the same search, filters and sort show, and started
// afresh when they change, so the bar's actions only ever reach rows the teacher can see.
// Area: quizzes

import { useCallback, useMemo, useState } from 'react';

const NONE = new Set();

// rows: the rows shown; view: a key of what they show (the API query). Returns the ticked rows, still shown, and the
// ways to tick: one, all shown, or none.
export function useSelection(rows, view) {
  const [ticked, setTicked] = useState({ view, ids: NONE });
  const ids = ticked.view === view ? ticked.ids : NONE; // another view starts with nothing ticked
  const chosen = useMemo(() => rows.filter((quiz) => ids.has(quiz.id)), [rows, ids]);
  const all = rows.length > 0 && chosen.length === rows.length;

  const toggle = useCallback(
    (quiz) =>
      setTicked((previous) => {
        const next = new Set(previous.view === view ? previous.ids : NONE);
        if (next.has(quiz.id)) next.delete(quiz.id);
        else next.add(quiz.id);
        return { view, ids: next };
      }),
    [view]
  );
  const toggleAll = useCallback(
    () => setTicked({ view, ids: all ? NONE : new Set(rows.map((quiz) => quiz.id)) }),
    [view, all, rows]
  );
  const clear = useCallback(() => setTicked({ view, ids: NONE }), [view]);

  return { chosen, has: (id) => ids.has(id), all, some: chosen.length > 0 && !all, toggle, toggleAll, clear };
}
