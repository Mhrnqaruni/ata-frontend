// The lists' refresh rules (C-10, B10): a list polls only while one of its rows is being made, and when one
// finishes, the child's notebook home and other lists refresh, and the shell's live region says what changed.
// Area: family

import { useEffect, useRef } from 'react';
import { hashKey } from '@tanstack/react-query';
import { queryClient } from '../../../services/queryCache';
import { familyKeys } from '../familyApi';
import { isRunning, kindWords } from '../familyWords';

const POLL = 3000; // as often as the notebook home polls

/** A list's refetchInterval: every 3 s while any of its items is being made, otherwise never. */
export const pollWhileMaking = (items) => (items?.some(isRunning) ? POLL : false);

/** What the live region says when an item finishes (C-19), in its row's words, and never "we" (design §1.8). */
export function finishedWords({ kind, status }) {
  const words = kindWords[kind] || { label: 'Activity', ready: 'It’s ready' };
  if (status === 'completed') return `${words.ready}.`;
  if (status === 'needs_input') return 'Some pages are missing.';
  return `The ${words.label.toLowerCase()} didn’t finish.`;
}

/**
 * Watches a list's items, under its query `key`. When one that was being made stops, the child's notebook home and
 * its other activity lists refresh (this list already has the change), and `announce(text)` says what happened.
 */
export default function useFinishedRows(items, key, announce) {
  const [, generation, userId, childId] = key;
  const own = hashKey(key);
  const making = useRef(null);
  useEffect(() => {
    if (!items) return;
    const before = making.current;
    making.current = new Set(items.filter(isRunning).map((item) => item.id));
    // The first answer only sets the starting point: nothing has finished while this list watched.
    const finished = before ? items.filter((item) => before.has(item.id) && !making.current.has(item.id)) : [];
    if (!finished.length) return;
    void queryClient.invalidateQueries({
      queryKey: familyKeys.child(generation, userId, childId),
      predicate: ({ queryKey }) =>
        queryKey[4] === 'home' || (queryKey[4] === 'activities' && hashKey(queryKey) !== own),
    });
    announce?.(finished.map(finishedWords).join(' '));
  }, [items, own, generation, userId, childId, announce]);
}
