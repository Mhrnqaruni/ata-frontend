// Where a quiz or a run opens (Phase 1.46, SOT-16; design.md §3.1): the editor, its live or homework page, or its
// results, from the library's state, so the quiz list, Home and the other pages open the same page.
// Area: quizzes

const part = (id) => encodeURIComponent(String(id));

export const editLink = (quizId) => `/quizzes/${part(quizId)}/edit`;

// A quiz's one results page; with a run, that run is picked.
export const resultsLink = (quizId, runId) => `/quizzes/${part(quizId)}/results${runId ? `?run=${part(runId)}` : ''}`;

// An open run's page: { id, kind: 'live' | 'homework' }, as the library's open_run and the runs list give it.
export const runLink = (run) => `/quizzes/${run.kind === 'homework' ? 'sp-sessions' : 'sessions'}/${part(run.id)}/host`;

// A library item's page: its open run's live or homework page; the editor for a draft or a quiz never run; else its
// results (design.md §3.1's row click).
export function quizLink(item) {
  if (item.open_run) return runLink(item.open_run);
  if (item.state === 'draft' || !item.run_count) return editLink(item.id);
  return resultsLink(item.id);
}
