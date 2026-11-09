// "How Sam is doing" on the child's profile (Phase 1.38 design §3.4): each scored check or quiz as one percentage,
// oldest first, each dot's tooltip, and the one sentence under the chart.
// Area: family

const LAST = 5; // the sentence covers the last five scores (SOT C-24)

// The sentence's words for each kind: one item, several, and the line before the first.
const WORDS = {
  check: {
    one: 'homework check',
    many: 'homework checks',
    none: 'homework scores will show here after the first check',
  },
  quiz: { one: 'quiz', many: 'quizzes', none: 'quiz scores will show here after the first quiz' },
};

/** A dot's date on the axis and in its tooltip: "2 Nov". */
export const dayMonth = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

// A scored item's [right, total, time]: a check's marks once it's marked, or a quiz's latest attempt, dated when
// that score was made. Null for anything without a score: an unmarked check, an untried quiz, any other kind.
function scoreOf({ kind, summary, finishedAt, createdAt }) {
  if (kind === 'check' && summary) return [summary.right, summary.total, finishedAt || createdAt];
  if (kind === 'quiz' && summary?.latest) return [summary.latest.score, summary.latest.total, summary.latest.at];
  return null;
}

/**
 * The chart's points from the activity list's items, in any order: { id, title, at, time, right, total, percent,
 * item }, oldest first. `percent` is the whole percentage the row's "4 of 6 right" also shows (67), so the two agree.
 */
export function scorePoints(items) {
  const points = [];
  for (const item of items ?? []) {
    const score = scoreOf(item);
    if (!score) continue;
    const [right, total, at] = score;
    const time = Date.parse(at);
    // A check with no marked answers has nothing to plot, and a point needs a time.
    if (!(total > 0) || Number.isNaN(time)) continue;
    const percent = Math.round((right / total) * 100);
    points.push({ id: item.id, title: item.title, at, time, right, total, percent, item });
  }
  return points.sort((a, b) => a.time - b.time);
}

/** A dot's tooltip and name: "Times tables sheet · 4 of 6 right (67%) · 2 Nov". */
export const pointLabel = ({ title, right, total, percent, at }) =>
  `${title} · ${right} of ${total} right (${percent}%) · ${dayMonth(at)}`;

/**
 * The sentence under the chart (design §3.4) as { lead, strong, tail }, where `strong` is the part in bold:
 * - two or more points, from the first to the last of the last five: "**Up from 60% to 80%** across the last 5
 *   homework checks." (or "Down from…", or "Steady at…");
 * - one point: "Sam's first homework check: **80%**.";
 * - none: "Sam's homework scores will show here after the first check."
 * `kind` is 'check' or 'quiz', and `name` the child's first name.
 */
export function trendWords(points, kind, name) {
  const words = WORDS[kind] ?? WORDS.check;
  const last = points.slice(-LAST);
  if (!last.length) return { lead: `${name}’s ${words.none}.`, strong: '', tail: '' };
  const to = last[last.length - 1].percent;
  if (last.length === 1) return { lead: `${name}’s first ${words.one}: `, strong: `${to}%`, tail: '.' };
  const from = last[0].percent;
  let change = `Steady at ${to}%`;
  if (to > from) change = `Up from ${from}% to ${to}%`;
  if (to < from) change = `Down from ${from}% to ${to}%`;
  return { lead: '', strong: change, tail: ` across the last ${last.length} ${words.many}.` };
}
