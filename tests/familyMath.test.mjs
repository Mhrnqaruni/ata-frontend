// Parent mode keeps the AI's digits inside maths (Phase 1.38, row 9): 2.350 stays 2.350 through the shared renderer.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { keepDigits } from '../src/areas/family/familyMath.js';
import { parseTextWithMath } from '../src/utils/mathRenderer.js';

test('numbers with a trailing zero inside a formula are kept as text, and nothing else changes', () => {
  assert.equal(keepDigits('$2.350$ cm is identical to $2.35$ cm'), '$\\text{2.350}$ cm is identical to $2.35$ cm');
  assert.equal(keepDigits('$$x = 1.50 + 0.50$$'), '$$x = \\text{1.50} + \\text{0.50}$$');
  assert.equal(keepDigits('$10.0 \\times 2$'), '$\\text{10.0} \\times 2$');
  // Already kept, a plain decimal, an integer, a price and prose stay as they are.
  for (const same of ['$\\text{2.350}$', '$2.35 + 100$', 'It costs $5 and 2.350 is prose', '$\\frac{1}{2}$', '', null])
    assert.equal(keepDigits(same), same);
});

test('through the shared renderer, the digits reach the page as written', () => {
  const html = (text) =>
    parseTextWithMath(keepDigits(text))
      .map((part) => part.content)
      .join('');
  assert.match(html('$2.350$ cm'), /2\.350/);
  assert.doesNotMatch(
    parseTextWithMath('$2.350$ cm')
      .map((part) => part.content)
      .join(''),
    /2\.350/
  ); // the shared path alone drops it
  assert.match(html('$\\frac{1}{2}$'), /frac|½|1/);
});
