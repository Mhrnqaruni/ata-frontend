import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTextWithMath, normalizeMathText } from '../src/utils/mathRenderer.js';

test('standard and legacy equations render without changing their meaning', () => {
  const examples = [String.raw`$x^{2}$`, String.raw`$\frac{dy}{dx}$`, String.raw`\(\pi\)`,
    '$$x^2\n+1$$', '$sqrt(x)$', String.raw`\frac{1}{2}`, '3x^{2}'];
  for (const text of examples) {
    const parts = parseTextWithMath(text);
    assert(parts.some(part => part.type === 'math'), text);
    assert(!parts.some(part => part.type === 'error'), text);
  }
});

test('currency and ambiguous prose are not guessed as mathematical expressions', () => {
  for (const text of ['Price $5 and $10.', '1/2', 'Question one: x^2', String.raw`The answer is \frac{1}{2}`]) {
    assert.equal(normalizeMathText(text), text);
    assert(parseTextWithMath(text).every(part => part.type === 'text'));
  }
});

test('untrusted commands and oversized math remain safe and visible', () => {
  const parts = parseTextWithMath(String.raw`$\href{javascript:alert(1)}{x}$`);
  assert(parts.every(part => !part.content.includes('href="javascript:')));
  assert(parseTextWithMath('$' + 'x'.repeat(10001) + '$').some(part => part.type === 'error'));
});
