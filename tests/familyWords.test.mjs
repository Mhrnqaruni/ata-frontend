// Parent mode's words (Phase 1.37, S2.5; C-22, design §5.2): the school years a child can be in.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { YEARS } from '../src/areas/family/familyWords.js';

test('the year list runs from Year 1 to Year 13', () => {
  assert.equal(YEARS.length, 13);
  assert.equal(YEARS[0], 'Year 1');
  assert.equal(YEARS[12], 'Year 13');
  assert.deepEqual(
    YEARS,
    [...YEARS.keys()].map((i) => `Year ${i + 1}`)
  );
});
