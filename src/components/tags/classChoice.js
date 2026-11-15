// The class chooser's rules (Phase 1.46, SOT-11; design.md §3.3): each class's year from its name, the classes grouped
// by year, the search, the recent classes, and ticking within an audience's limit.
// Area: academics

// An audience holds at most 100 classes and 100 student groups (backend models/audience.py).
export const MAX_CHOSEN = 100;

// A class's year from the start of its name: "7A Science" → 7, "Year 9 Biology" → 9, "Y11 Maths" → 11; else null.
export function yearOf(name) {
  const match = /^\s*(?:y(?:ear)?\s*)?(\d{1,2})(?!\d)/i.exec(String(name ?? ''));
  const year = match ? Number(match[1]) : NaN;
  return year >= 1 && year <= 13 ? year : null;
}

// Names in natural order, so 7B comes before 7C, and 9A before 10A.
export const byName = (a, b) =>
  String(a.name ?? '').localeCompare(String(b.name ?? ''), 'en-GB', { numeric: true, sensitivity: 'base' });

// The classes as year groups, youngest first, then "Other classes": [{ key, label, items }], each by name.
export function groupByYear(classes) {
  const groups = new Map();
  for (const item of [...(classes || [])].sort(byName)) {
    const year = yearOf(item.name);
    const key = year ?? 'other';
    if (!groups.has(key)) groups.set(key, { key, label: year ? `Year ${year}` : 'Other classes', items: [] });
    groups.get(key).items.push(item);
  }
  return [...groups.values()].sort((a, b) => (a.key === 'other') - (b.key === 'other') || a.key - b.key);
}

// The items whose name has every word typed, in any case: "8b sci" finds "8B Science".
export function matches(items, query) {
  const words = String(query ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return items || [];
  return (items || []).filter((item) =>
    words.every((word) =>
      String(item.name ?? '')
        .toLowerCase()
        .includes(word)
    )
  );
}

// Recent: the classes of the teacher's most recently used quizzes, newest first, each once, at most 5. Give it the
// items of GET /api/quiz-library?sort=last_used&limit=20 (SOT-11).
export function recentClassIds(libraryItems, max = 5) {
  const ids = [];
  for (const item of libraryItems || []) {
    for (const each of item.classes || []) if (!ids.includes(each.id)) ids.push(each.id);
  }
  return ids.slice(0, max);
}

// Ticks or unticks an id. A tick past the limit is refused: the list comes back unchanged.
export function toggle(ids, id, max = MAX_CHOSEN) {
  if (ids.includes(id)) return ids.filter((each) => each !== id);
  return ids.length >= max ? ids : [...ids, id];
}

// "28 pupils", "1 pupil".
export const pupils = (count) => `${count ?? 0} ${count === 1 ? 'pupil' : 'pupils'}`;
