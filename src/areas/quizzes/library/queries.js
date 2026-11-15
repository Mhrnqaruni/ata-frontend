// The quiz list's reads as React Query hooks (Phase 1.46, SOT-2, SOT-3), on the area's shared keys (../queries.js):
// the list's pages, 50 rows at a time, the size of the plain list, the teacher's tags and their recent classes.
// Area: quizzes

import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { recentClassIds } from '../../../components/tags/classChoice';
import { useAuth } from '../../../hooks/useAuth';
import { queryClient } from '../../../services/queryCache';
import { quizKeys } from '../queries';
import { getLibrary, getTags } from './api';

export const PAGE_SIZE = 50;

// The rows loaded so far across the pages.
const loaded = (pages) => pages.reduce((count, page) => count + page.items.length, 0);

// The list for these filters: 50 rows, then 50 more on each "Show more" (design.md §3.1). The old rows stay while new
// filters load, so typing never flashes an empty table. The key ends in 'pages', so a plain read of the same filters
// elsewhere never shares this cache entry, while a refresh of the library (quizKeys.library(userId)) reaches it.
export function useLibrary(params) {
  const { user } = useAuth();
  return useInfiniteQuery({
    queryKey: [...quizKeys.library(user?.id, params), 'pages'],
    queryFn: ({ pageParam, signal }) => getLibrary({ ...params, limit: PAGE_SIZE, offset: pageParam }, { signal }),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (loaded(pages) < last.total ? loaded(pages) : undefined),
    placeholderData: keepPreviousData,
    enabled: Boolean(user?.id),
    refetchInterval: 60000, // a run started or ended elsewhere shows within a minute
    refetchIntervalInBackground: false,
  });
}

// How many quizzes the plain list holds, for "23 of 135": a one-row read, made only while a filter is set.
export function useLibraryTotal(enabled) {
  const { user } = useAuth();
  const params = { limit: 1 };
  return useQuery({
    queryKey: quizKeys.library(user?.id, params),
    queryFn: ({ signal }) => getLibrary(params, { signal }),
    enabled: Boolean(user?.id) && enabled,
    select: (page) => page.total,
  });
}

// The teacher's quiz tags, by name, each with its number of quizzes.
export function useQuizTags() {
  const { user } = useAuth();
  return useQuery({
    queryKey: quizKeys.tags(user?.id),
    queryFn: ({ signal }) => getTags({ signal }),
    enabled: Boolean(user?.id),
  });
}

// The class chooser's Recent (SOT-11): the classes of the 20 quizzes used last, newest first, read when it's needed.
export function useRecentClasses(enabled) {
  const { user } = useAuth();
  const params = { limit: 20 };
  return useQuery({
    queryKey: quizKeys.library(user?.id, params),
    queryFn: ({ signal }) => getLibrary(params, { signal }),
    enabled: Boolean(user?.id) && enabled,
    select: (page) => recentClassIds(page.items),
  });
}

// A renamed quiz's title in every cached page of the list, so its row shows it at once (X3), before the refresh
// that every rename starts comes back.
export function renameInLibrary(userId, quizId, title) {
  const rename = (items) => items?.map((item) => (item.id === quizId ? { ...item, title } : item));
  const page = (data) => ({ ...data, items: rename(data.items), live_now: rename(data.live_now) });
  queryClient.setQueriesData({ queryKey: quizKeys.library(userId) }, (data) => {
    if (data?.pages) return { ...data, pages: data.pages.map(page) };
    return data?.items ? page(data) : data;
  });
}
