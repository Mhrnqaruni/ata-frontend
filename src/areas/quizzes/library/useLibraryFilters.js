// The quiz list's search, filters and sort, kept in the address (so back, reload and a shared link keep them), and
// the last choice restored on the next visit (design.md §3.1). The search itself isn't restored: it's for now.
// Area: quizzes

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NO_FILTERS, readFilters, writeFilters } from './filters';

const SAVED = 'mst.quizzes.library.'; // + the teacher's id: their filters and sort as an address query

const load = (key) => {
  try {
    return localStorage.getItem(key) || '';
  } catch {
    return ''; // storage is optional
  }
};
const save = (key, value) => {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* storage is optional */
  }
};

export function useLibraryFilters(userId) {
  const [search, setSearch] = useSearchParams();
  const text = search.toString();
  const filters = useMemo(() => readFilters(text), [text]);
  const key = userId ? `${SAVED}${userId}` : null;
  const restored = useRef(false);

  // A visit to the bare address takes back the last filters and sort; every later choice is kept for the next one.
  useEffect(() => {
    if (!key) return;
    if (!restored.current) {
      restored.current = true;
      const last = load(key);
      if (!text && last) {
        setSearch(last, { replace: true });
        return;
      }
    }
    save(key, writeFilters({ ...filters, q: '' }));
  }, [key, text, filters, setSearch]);

  // Changes some filters, keeping the rest. The address is replaced, so typing doesn't fill the history.
  const update = useCallback(
    (changes) => setSearch((previous) => writeFilters({ ...readFilters(previous), ...changes }), { replace: true }),
    [setSearch]
  );
  // Clear filters: the search and every filter go, the sort stays.
  const clear = useCallback(
    () => update({ ...NO_FILTERS, sort: filters.sort, order: filters.order }),
    [update, filters.sort, filters.order]
  );
  return { filters, update, clear };
}
