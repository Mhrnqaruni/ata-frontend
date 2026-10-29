// /src/utils/mathRenderer.js

import katex from 'katex';
import { create, all } from 'mathjs';

const math = create(all, {});
const trigRegex = /\b(arcsin|arccos|arctan|sin|cos|tan|log|ln)\b/g;

/**
 * Convert user-friendly math notation to LaTeX
 * Example: "x^2 + sqrt(x)" -> "x^{2} + \\sqrt{x}"
 */
function toLatex(expr) {
  const node = math.parse(expr);
  return node.toTex({ parenthesis: "keep" });
}

function convertSqrtGroups(expr) {
  let output = '';
  let i = 0;

  while (i < expr.length) {
    if (expr.startsWith('sqrt(', i)) {
      i += 5;
      let depth = 1;
      const start = i;
      while (i < expr.length && depth > 0) {
        if (expr[i] === '(') {
          depth += 1;
        } else if (expr[i] === ')') {
          depth -= 1;
        }
        i += 1;
      }
      const inner = depth === 0 ? expr.slice(start, i - 1) : expr.slice(start, i);
      output += `\\sqrt{${inner}}`;
      continue;
    }
    output += expr[i];
    i += 1;
  }

  return output;
}

function convertCaretGroups(expr) {
  let output = '';
  let i = 0;

  while (i < expr.length) {
    if (expr[i] === '^' && expr[i + 1] === '(') {
      i += 2;
      let depth = 1;
      const start = i;
      while (i < expr.length && depth > 0) {
        if (expr[i] === '(') {
          depth += 1;
        } else if (expr[i] === ')') {
          depth -= 1;
        }
        i += 1;
      }
      const inner = depth === 0 ? expr.slice(start, i - 1) : expr.slice(start, i);
      output += `^{${inner}}`;
      continue;
    }
    output += expr[i];
    i += 1;
  }

  return output;
}

function convertSimpleMathFallback(expr) {
  let out = (expr || '').trim();
  if (!out) return out;

  out = convertSqrtGroups(out);
  out = convertCaretGroups(out);
  out = out.replace(trigRegex, '\\$1');
  out = out.replace(/\bpi\b/g, '\\pi');
  out = out.replace(/\*/g, '\\cdot ');
  return out;
}

/**
 * Parse text containing math formulas and convert to renderable parts
 * @param {string} text - Text with $ and $$ delimited formulas
 * @returns {Array} Array of {type, content, isDisplay, error} objects
 */
// Only repair an entire unmistakable formula, never equations guessed inside prose.
export function normalizeMathText(text) {
  if (typeof text !== 'string' || !text || /\$|\\\(|\\\[/.test(text)) return text;
  // A paper often has prose followed by a standalone equation on its next line.
  // Recognise those complete lines only; never solve or rewrite maths inside prose.
  if (text.includes('\n')) return text.split('\n').map(normalizeMathText).join('\n');
  const candidate = text.replace(/²/g, '^2').replace(/³/g, '^3');
  const derivative = candidate.trim().match(/^d([A-Za-z])\/d([A-Za-z])\s*=$/);
  if (derivative) return `$\\frac{d${derivative[1]}}{d${derivative[2]}} =$`;
  const signal = /\\(?:frac|sqrt|pi|partial|int|sum|alpha|beta|theta)\b|[\w)]\s*[\^_]/.test(candidate);
  const stripped = candidate.replace(/\\[A-Za-z]+|\b(?:sqrt|sin|cos|tan|log|ln|pi)\b/g, '');
  return signal && !/[A-Za-z]{3,}/.test(stripped) ? '$' + candidate.trim() + '$' : text;
}

export function parseTextWithMath(text) {
  const source = normalizeMathText(typeof text === 'string' ? text : text == null ? '' : JSON.stringify(text));
  const parts = [];
  let lastIndex = 0;
  // Preserve escaped currency; also accept existing \(...\)/\[...\] content.
  const regex = /(?<!\\)\$\$([\s\S]+?)\$\$|(?<![\\$])\$(?!\$)([^$\n]+?)\$(?![\d$])|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
  for (const match of source.matchAll(regex)) {
    if (match.index > lastIndex) parts.push({ type: 'text', content: source.slice(lastIndex, match.index) });
    const content = match[1] ?? match[2] ?? match[3] ?? match[4];
    const isDisplay = match[1] != null || match[4] != null;
    try {
      if (content.length > 10000) throw new Error('Equation is too long');
      let tex = content.trim();
      if (!tex.includes('\\')) {
        // Legacy quizzes used mathjs syntax. Do not reinterpret genuine LaTeX.
        try { tex = toLatex(tex); } catch { tex = convertSimpleMathFallback(tex); }
      }
      parts.push({ type: 'math', isDisplay, content: katex.renderToString(tex, {
        throwOnError: true, trust: false, strict: 'warn', displayMode: isDisplay,
        output: 'htmlAndMathml', maxExpand: 1000, maxSize: 20,
      }) });
    } catch (error) {
      // Keep the source visible for correction; never silently substitute another formula.
      parts.push({ type: 'error', content, error: String(error.message || error) });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < source.length) parts.push({ type: 'text', content: source.slice(lastIndex) });
  return parts.length ? parts : [{ type: 'text', content: source }];
}
