// Keeps numbers as the AI wrote them inside maths (Phase 1.38, row 9): the shared renderer's mathjs path prints 2.350
// as 2.35, which made a story say "2.35 cm is identical to 2.35 cm". Teacher mode's renderer is unchanged.
// Area: family

// The renderer's own formula shapes: $$…$$ and $…$ (not an escaped or doubled dollar, not a price like $5).
const SEGMENT = /(?<!\\)\$\$([\s\S]+?)\$\$|(?<![\\$])\$(?!\$)([^$\n]+?)\$(?![\d$])/g;
// A whole number with a decimal point and a trailing zero, such as 2.350, 10.0 or 0.50; not one already kept.
const TRAILING = /(?<![\w.\\{])(\d+\.\d*?0+)(?![\d.}])/g;

/**
 * Wraps each such number in a formula as `\text{2.350}`: with a backslash present, the renderer hands the formula
 * to KaTeX as it is, and KaTeX prints the digits as written. Text outside formulas, and formulas without such
 * numbers, are returned unchanged.
 */
export function keepDigits(text) {
  if (typeof text !== 'string' || !text.includes('$')) return text;
  return text.replace(SEGMENT, (whole, display, inline) => {
    const body = display ?? inline;
    if (!new RegExp(TRAILING.source).test(body)) return whole;
    const kept = body.replace(TRAILING, '\\text{$1}');
    return display != null ? `$$${kept}$$` : `$${kept}$`;
  });
}
