import { QueryClient } from '@tanstack/react-query';

// Teacher data lives only in this tab's memory, never cookies or persisted storage.
export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30000, gcTime: 600000, retry: false,
    refetchOnWindowFocus: true, refetchOnReconnect: true } },
});
let generation = 0;
export const sessionGeneration = () => generation;
export function resetTeacherSession({ preserveDrafts = false } = {}) {
  generation += 1;
  // Unsent parent drafts survive reload in this tab, but never sign-out/account changes.
  try { if(!preserveDrafts) for(const key of Object.keys(sessionStorage)) if(key.startsWith('mst.family.draft.')) sessionStorage.removeItem(key); } catch { /* Storage is optional. */ }
  queryClient.clear(); // Cancels old reads before a new account can render.
  return generation;
}
export const cacheFamilies = {
  roster: ['classes', 'class', 'summary', 'tags', 'quizzes', 'performance'],
  assessment: ['assessments', 'quick', 'class', 'summary', 'performance'],
  quiz: ['quizzes', 'quizSession', 'class', 'summary', 'performance'],
  tags: ['tags', 'classes', 'class', 'quizzes', 'performance'],
  all: ['classes', 'class', 'summary', 'tags', 'quizzes', 'performance', 'assessments', 'quick', 'quizSession'],
};
// Only a notification crosses tabs. No student data or credentials are broadcast.
const channel = typeof window !== 'undefined' && typeof BroadcastChannel !== 'undefined'
  ? new BroadcastChannel('mst-teacher-data-changed') : null;
export async function invalidateTeacher(families, broadcast = true, issuedBy = generation) {
  if (issuedBy !== generation) return;
  const filter = { predicate: query => query.queryKey[0] === 'teacher' && families.includes(query.queryKey[3]) };
  await queryClient.cancelQueries(filter);
  if (issuedBy !== generation) return;
  // A hidden list must not briefly resurrect a deleted card or an old name on return.
  // Only affected inactive views lose their cache; ordinary navigation stays instant.
  queryClient.removeQueries({ ...filter, type: 'inactive' });
  if (broadcast) channel?.postMessage({ families });
  await queryClient.invalidateQueries(filter);
}
if (channel) channel.onmessage = event => {
  const families = event.data?.families;
  if (Array.isArray(families) && families.every(item => cacheFamilies.all.includes(item))) {
    void invalidateTeacher(families, false);
  }
};

// Explicit command names at each service export keep invalidation reviewable.
// Reads, AI calls, downloads and participant controls are not automatically cached.
export function invalidateAfter(service, commands, families) {
  const wrapped = { ...service };
  for (const name of commands) {
    if (typeof service[name] !== 'function') throw new Error(`Unknown cache command: ${name}`);
    wrapped[name] = async (...args) => {
      const issuedBy = generation;
      const result = await service[name](...args);
      if (issuedBy === generation) void invalidateTeacher(families, true, issuedBy);
      return result;
    };
  }
  return wrapped;
}

// Unsaved family answers stay in memory only. Warn before a reload would discard them.
if (typeof window !== 'undefined') window.addEventListener('beforeunload', event => {
  const dirty = queryClient.getQueryCache().getAll().some(query =>
    query.queryKey[0] === 'family' && query.queryKey[4] === 'quizDraft' &&
    Object.keys(query.state.data?.answers || {}).length > 0);
  if (dirty) { event.preventDefault(); event.returnValue = ''; }
});
