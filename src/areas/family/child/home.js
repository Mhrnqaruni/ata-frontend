// Home's rules (Phase 1.38 design §2.3, §2.6): the greeting by local time, the child's latest items, and whether the
// parent hid Get started, remembered in this browser for each parent and child.
// Area: family

/** How many rows "Sam's latest" shows, which is also the activity list's `limit` for Home. */
export const LATEST = 6;

// Home lists homework checks and the four kinds of activity; explanations stay in the Notebook.
const LISTED = ['check', 'quiz', 'flashcards', 'mindmap', 'story'];
const time = (item) => Date.parse(item.finishedAt || item.createdAt) || 0;

/** "Good morning" before 12:00, "Good afternoon" before 18:00, then "Good evening", with the parent's first name. */
export function greeting(now, name) {
  const hour = now.getHours();
  const words = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${words}, ${name}` : words;
}

/** The latest homework checks and activities, newest first, at most LATEST. */
export function latestItems(items) {
  return (items ?? [])
    .filter((item) => LISTED.includes(item.kind))
    .sort((a, b) => time(b) - time(a))
    .slice(0, LATEST);
}

const hiddenKey = (userId, childId) => `mst.family.getStarted.hidden.${userId}.${childId}`;

/** Whether the parent pressed Hide on Get started for this child; false when storage is blocked. */
export function readHidden(userId, childId) {
  try {
    return localStorage.getItem(hiddenKey(userId, childId)) === '1';
  } catch {
    return false;
  }
}

/** Remembers Hide; when storage is blocked, Get started simply comes back next time. */
export function writeHidden(userId, childId) {
  try {
    localStorage.setItem(hiddenKey(userId, childId), '1');
  } catch {
    /* Not remembered. */
  }
}
