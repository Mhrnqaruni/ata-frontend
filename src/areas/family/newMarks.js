// The "new" marks' store and rule (design §3.12; SOT C-24): which finished items this browser hasn't opened yet.
// Plain functions with no React: useNewMarks reads them, and any page that opens a result shares the one store.
// Area: family

// localStorage `mst.family.seen.<userId>.<childId>` holds { since, opened }: `since` is the notebook home's
// serverTime when this browser first kept marks for the child, and `opened` the ids opened here, newest first.
// Ids only, so the store holds nothing personal.
const KEEP = 300;
// The four kinds under Activities, which share one dot on the phone bar (design §3.3).
const MADE = ['quiz', 'flashcards', 'mindmap', 'story'];
const KINDS = ['check', ...MADE, 'learn'];

const seenKey = (userId, childId) => `mst.family.seen.${userId}.${childId}`;
const listeners = new Set();
// key → { raw, seen }: the same object comes back while the stored text is unchanged, as useSyncExternalStore needs.
const cache = new Map();

/** Calls `listener` after each change this tab makes to a child's store. Returns the unsubscribe. */
export function subscribeSeen(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The child's stored { since, opened }, or null when there's none, it doesn't parse, or storage is blocked. */
export function readSeen(userId, childId) {
  if (!userId || !childId) return null;
  const key = seenKey(userId, childId);
  let raw;
  try {
    raw = localStorage.getItem(key);
  } catch {
    return null; // Blocked storage only loses the marks.
  }
  const cached = cache.get(key);
  if (cached && cached.raw === raw) return cached.seen;
  const seen = parse(raw);
  cache.set(key, { raw, seen });
  return seen;
}

// A stored record, or null for anything that isn't one (a missing key parses to null too).
function parse(raw) {
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value?.opened)) return null;
    return {
      since: typeof value.since === 'string' ? value.since : null,
      opened: value.opened.filter((id) => typeof id === 'string'),
    };
  } catch {
    return null;
  }
}

function write(userId, childId, seen) {
  try {
    localStorage.setItem(seenKey(userId, childId), JSON.stringify(seen));
  } catch {
    return; // Blocked or full: the marks stay as they were.
  }
  listeners.forEach((listener) => listener());
}

/** Starts the child's marks at the home's serverTime, the first time this browser keeps them (C-24). */
export function startSeen(userId, childId, serverTime) {
  if (!userId || !childId || !serverTime) return;
  const seen = readSeen(userId, childId);
  if (seen?.since) return;
  write(userId, childId, { since: serverTime, opened: seen?.opened ?? [] });
}

/** Records that an item was opened in this browser, which clears its mark. Keeps the newest 300 ids. */
export function rememberOpened(userId, childId, activityId) {
  if (!userId || !childId || !activityId) return;
  const seen = readSeen(userId, childId);
  // Already the newest: no write, so a caller that marks on every render can't loop.
  if (seen?.opened[0] === activityId) return;
  const opened = [activityId, ...(seen?.opened ?? []).filter((id) => id !== activityId)].slice(0, KEEP);
  write(userId, childId, { since: seen?.since ?? null, opened });
}

/**
 * C-24's rule over the notebook home's activities and attempts:
 * - a quiz is new while it's completed, has no attempt and hasn't been opened here;
 * - any other kind is new when it's completed, finished after `since`, and hasn't been opened here.
 * With no store (storage blocked, or not started yet) nothing is new.
 * Returns the new ids, and `counts`: how many of each kind are new, plus `activities` for the four Activities kinds.
 */
export function newMarks(home, seen) {
  const ids = new Set();
  const counts = Object.fromEntries([...KINDS, 'activities'].map((name) => [name, 0]));
  if (!home || !seen) return { ids, counts };
  const opened = new Set(seen.opened);
  const tried = new Set((home.attempts ?? []).map((attempt) => attempt.activityId));
  const since = Date.parse(seen.since); // NaN until started, so only quizzes can be new then
  for (const row of home.activities ?? []) {
    const fresh = row.kind === 'quiz' ? !tried.has(row.id) : Date.parse(row.finishedAt) > since;
    if (row.status !== 'completed' || opened.has(row.id) || !fresh) continue;
    ids.add(row.id);
    counts[row.kind] = (counts[row.kind] ?? 0) + 1;
    if (MADE.includes(row.kind)) counts.activities += 1;
  }
  return { ids, counts };
}

/**
 * How many new items each section shows (Phase 1.38 design §1.3: "1 new"), as { [section id]: count }: a list section
 * when its kind has new items, and its group's own phone tab (Activities) with the group's total. `sections` is
 * sections.js's list, passed in so this file stays free of React and icons.
 */
export function newDots(counts, sections) {
  const dots = {};
  for (const { id, kind, group } of sections) {
    if (!(counts[kind] > 0)) continue;
    dots[id] = counts[kind];
    if (group) dots[group] = (dots[group] ?? 0) + counts[kind];
  }
  return dots;
}
