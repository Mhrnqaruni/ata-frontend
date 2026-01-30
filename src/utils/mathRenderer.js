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
export function parseTextWithMath(text) {
  if (!text) return [{ type: 'text', content: '' }];

  const parts = [];
  let lastIndex = 0;

  // Regex to match $$...$$ or $...$
  const regex = /\$\$(.*?)\$\$|\$(.*?)\$/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the math
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }

    // Add the math part
    const mathContent = match[1] || match[2]; // $$...$$ or $...$
    const isDisplay = !!match[1]; // true if $$...$$

    try {
      const tex = toLatex(mathContent);
      const html = katex.renderToString(tex, {
        throwOnError: false,
        displayMode: isDisplay,
      });

      parts.push({
        type: 'math',
        content: html,
        isDisplay
      });
    } catch (e) {
      try {
        const fallbackTex = mathContent.includes('\\')
          ? mathContent
          : convertSimpleMathFallback(mathContent);
        const fallbackHtml = katex.renderToString(fallbackTex, {
          throwOnError: false,
          displayMode: isDisplay,
        });

        parts.push({
          type: 'math',
          content: fallbackHtml,
          isDisplay
        });
      } catch (fallbackError) {
        // If math parsing fails, show it as error
        parts.push({
          type: 'error',
          content: mathContent,
          error: String(fallbackError?.message || fallbackError)
        });
      }
    }

    lastIndex = regex.lastIndex;
  }

  // Add remaining text after last math
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }

  return parts;
}
