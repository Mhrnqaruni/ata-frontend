// One child's "new" marks (design §3.12): which items are new, how many of each kind, and a way to clear one.
// It reads the cached notebook home without polling it, so the Notebook's own polling stays the only poller (C-10).
// Area: family

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import { sessionGeneration } from '../../services/queryCache';
import { familyApi, familyKeys } from './familyApi';
import { newMarks, readSeen, rememberOpened, startSeen, subscribeSeen } from './newMarks';

/**
 * Returns { isNew(id), counts, markOpened(id) } for the child.
 * `counts` has each kind (check, quiz, flashcards, mindmap, story, learn), plus `activities` for the four
 * Activities kinds together: the panel's and the phone bar's dots, and the Activities page's pills.
 * Call markOpened(id) when a result shows a finished item.
 */
export default function useNewMarks(childId) {
  const userId = useAuth().user?.id;
  // The home's own key and reader, with no refetchInterval of its own (C-10).
  const home = useQuery({
    queryKey: familyKeys.home(sessionGeneration(), userId, childId),
    queryFn: ({ signal }) => familyApi.home(childId, { signal }),
    enabled: Boolean(userId && childId),
  });
  const seen = useSyncExternalStore(subscribeSeen, () => readSeen(userId, childId));
  const serverTime = home.data?.serverTime;
  useEffect(() => {
    startSeen(userId, childId, serverTime);
  }, [userId, childId, serverTime]);
  const { ids, counts } = useMemo(() => newMarks(home.data, seen), [home.data, seen]);
  const markOpened = useCallback((activityId) => rememberOpened(userId, childId, activityId), [userId, childId]);
  return { isNew: (activityId) => ids.has(activityId), counts, markOpened };
}
