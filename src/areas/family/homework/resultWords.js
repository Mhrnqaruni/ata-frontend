// The words and rules of a marked homework check (design §5.5): each answer's state and words, the question numbers,
// the summary's counts and its bar's label, and the text helpers that the cards and the PDF share.
// Area: family

const STATE = { correct: 'ok', needs_work: 'warm', uncertain: 'check' };
/** An answer's state: ok (right), warm (not quite: the answer needs a fix) or check (the AI isn't sure). */
export const stateOf = (check) => STATE[check.judgement] || 'check';
/** Each state's word, on its card's badge and in the PDF. */
export const WORD = { ok: 'Right', warm: 'Not quite', check: 'AI isn’t sure' };
/** Each state's mark, after its question number. */
export const MARK = { ok: '✓', warm: '!', check: '?' };

/** The legend in words (design §5.5): what each mark means, and who should act. */
// Three short items (design §5.5; a tester read the long ones three times): what to press is said under them.
export const legend = () => [
  ['ok', '✓ Right'],
  ['warm', '! Not quite'],
  ['check', '? AI isn’t sure'],
];

/** The summary's counts from the answers' states: { right, warm, unsure, look }, where look = warm + unsure. */
export function countStates(states) {
  const count = (state) => states.filter((value) => value === state).length;
  const [right, warm, unsure] = [count('ok'), count('warm'), count('check')];
  return { right, warm, unsure, look: warm + unsure };
}

/** The summary bar's hidden label (design §5.5): "4 right, 1 not quite, 1 the AI isn’t sure about". */
export function barLabel({ right, warm, unsure }) {
  return [`${right} right`, warm && `${warm} not quite`, unsure && `${unsure} the AI isn’t sure about`]
    .filter(Boolean)
    .join(', ');
}

/** A question's number from its label: "01.1" → group "1", number "1.1". Labels without a number keep their order. */
export function parts(label, index) {
  const m = String(label || '').match(/(\d+)(?:\.(\d+))?/);
  if (!m) return { group: 'Other', chip: String(index + 1) };
  const g = String(Number(m[1]));
  return { group: g, chip: m[2] !== undefined ? `${g}.${Number(m[2])}` : g };
}

/** Mark-scheme style text → sections with bullets: "Starch: a; b. Sugar: c; d" → [{head:'Starch', items:[a,b]}, …]. */
export function structure(text) {
  const t = String(text || '').trim();
  if (!t) return [];
  const heads = [...t.matchAll(/(^|[.;]\s+)([A-Z][A-Za-z' ]{1,24}):\s+/g)];
  const sections = [];
  if (heads.length) {
    const lead = t.slice(0, heads[0].index + heads[0][1].length).trim();
    if (lead) sections.push({ head: '', body: lead });
    heads.forEach((h, k) => {
      const start = h.index + h[0].length;
      const end = k + 1 < heads.length ? heads[k + 1].index + heads[k + 1][1].length : t.length;
      sections.push({ head: h[2], body: t.slice(start, end).trim() });
    });
  } else sections.push({ head: '', body: t });
  return sections.map((s) => ({
    head: s.head,
    items: s.body
      .split(/;\s*/)
      .map((x) => x.trim().replace(/[.;]$/, ''))
      .filter(Boolean),
  }));
}

/** Simple maths reads as plain text ("$0.0625\\text{ mm}$" → "0.0625 mm", "$60\\,^{\\circ}\\text{C}$" → "60 °C"); real maths stays typeset. */
export function tidy(text) {
  let t = String(text || '').replace(/\$([^$]+)\$/g, (whole, m) => {
    const p = m
      .replace(/\\text\{([^}]*)\}/g, '$1')
      .replace(/\\(,|;|:|!| )/g, ' ')
      .replace(/\^\{?\\circ\}?/g, '°')
      .replace(/\\mu\s?/g, 'µ')
      .replace(/\\times/g, '×')
      .replace(/\\div/g, '÷')
      .replace(/\\%/g, '%')
      .replace(/\\cdot/g, '·')
      .replace(/\s+/g, ' ')
      .trim();
    return /[\\^_{}]/.test(p) ? whole : p;
  });
  t = t
    .replace(/(\d)\s*°\s*C\b/g, '$1 °C')
    .replace(/˚/g, '°')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')');
  return t;
}

/** Mark-scheme slashes as words: "unchanged/orange/brown" → "unchanged, orange or brown". */
export const plainWords = (text) =>
  tidy(text).replace(/\b[A-Za-z][A-Za-z-]*(?:\s?\/\s?[A-Za-z][A-Za-z-]*)+\b/g, (m) => {
    const p = m.split(/\s?\/\s?/);
    return p.length === 2 ? p.join(' or ') : `${p.slice(0, -1).join(', ')} or ${p.at(-1)}`;
  });

/** What Explain in chat asks the AI assistant about one question. */
export const explainText = (check, name) =>
  `Please explain question ${check.label} to ${name}.\nThe question: ${check.question}\n${name} wrote: ${check.studentAnswer || '(nothing)'}\nThe right answer is: ${check.expectedAnswer}`;

/** The page ranges a file's references cover, in order: [1, 2, 3, 5] → ["1–3", "5"]. */
export function pageRanges(pages) {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  const out = [];
  let start = sorted[0];
  let end = sorted[0];
  for (const page of sorted.slice(1)) {
    if (page === end + 1) end = page;
    else {
      out.push(start === end ? `${start}` : `${start}–${end}`);
      start = end = page;
    }
  }
  if (sorted.length) out.push(start === end ? `${start}` : `${start}–${end}`);
  return out;
}
