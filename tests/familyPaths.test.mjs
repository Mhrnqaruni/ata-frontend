// Parent mode's addresses (Phase 1.37, S2.3a, S2.4; C-1): the one link helper, old-style links, where /family opens
// and where the child switcher goes.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  childOf,
  familyPath,
  oldLinkPath,
  safeFamilyReturn,
  startPath,
  switchPath,
} from '../src/areas/family/familyPaths.js';

test('familyPath builds every family address, with and without a chat', () => {
  assert.equal(familyPath('c1'), '/family/children/c1');
  assert.equal(familyPath('c1', 'notebook'), '/family/children/c1/notebook');
  assert.equal(familyPath('c1', 'notebook', '', { chat: 'k9' }), '/family/children/c1/notebook?chat=k9');
  assert.equal(familyPath('c1', 'quizzes', 'a7'), '/family/children/c1/quizzes/a7');
  assert.equal(familyPath('c1', 'notebook/explanations', 'a8'), '/family/children/c1/notebook/explanations/a8');
  assert.equal(familyPath(''), '/family');
  assert.equal(childOf('/family/children/c1/notebook'), 'c1');
  assert.equal(childOf('/family'), '');
});

test('the switcher keeps the section, and drops a result id and a chat (S2.4)', () => {
  // A list stays the same list, for the other child.
  assert.equal(switchPath('/family/children/c1/quizzes', 'c2'), '/family/children/c2/quizzes');
  // A result belongs to the old child, so its list opens.
  assert.equal(switchPath('/family/children/c1/quizzes/a7', 'c2'), '/family/children/c2/quizzes');
  assert.equal(switchPath('/family/children/c1/notebook/explanations/a8', 'c2'), '/family/children/c2/notebook');
  // The Notebook opens without the old child's chat, so the new child's latest chat shows.
  assert.equal(switchPath('/family/children/c1/notebook?chat=k9', 'c2'), '/family/children/c2/notebook');
  assert.equal(switchPath('/family/children/c1', 'c2'), '/family/children/c2');
});

test('an old-style link goes to the Notebook at its chat, or to the child page', () => {
  assert.equal(oldLinkPath('?child=c1&chat=k9'), '/family/children/c1/notebook?chat=k9');
  assert.equal(oldLinkPath('?child=c1'), '/family/children/c1');
  assert.equal(oldLinkPath(''), '');
  assert.equal(oldLinkPath('?chat=k9'), '');
});

test('sign-in returns only to a same-site family path, kept with its query (S2.3b, C-16)', () => {
  assert.equal(safeFamilyReturn('/family/children/c1/notebook?chat=k9'), '/family/children/c1/notebook?chat=k9');
  assert.equal(safeFamilyReturn('/family'), '/family');
  for (const refused of [
    '//evil.example/family',
    'https://evil.example/family/children/c1',
    '/classes/42',
    '/familyx',
    '/family/../classes',
    '/\\evil.example',
    '',
    null,
  ])
    assert.equal(safeFamilyReturn(refused), '', String(refused));
});

test('/family opens the last family page, else the current child, else the first child, else setup', () => {
  const children = [{ id: 'c1' }, { id: 'c2' }, { id: 'gone', isActive: false }];
  const last = '/family/children/c2/notebook?chat=k9';
  assert.equal(startPath({ last, current: 'c1', children }), last);
  // A last page whose child was removed falls through to the current child.
  assert.equal(startPath({ last: '/family/children/gone/notebook', current: 'c2', children }), '/family/children/c2');
  assert.equal(startPath({ last: '', current: 'c2', children }), '/family/children/c2');
  assert.equal(startPath({ last: '', current: 'unknown', children }), '/family/children/c1');
  assert.equal(startPath({ last: '', current: '', children: [{ id: 'gone', isActive: false }] }), '');
  assert.equal(startPath({ last: '', current: '', children: [] }), '');
});
