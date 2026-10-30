import test from 'node:test';
import assert from 'node:assert/strict';
import { activityBasis, materialName, safeMarkdownUrl } from '../src/pages/family/familyPresentation.js';
test('empty selection never selects an existing book', () => {
  assert.equal(activityBasis([], true), 'conversation');
  assert.equal(activityBasis([], false), 'topic');
  assert.equal(activityBasis(['selected'], true), 'materials');
});
test('original filename is visible and display controls are removed', () => {
  assert.equal(materialName({title:'Worksheet',files:[{name:'Physics.pdf'}]}), 'Physics.pdf');
  assert.equal(materialName({files:[{name:'Exam\u202Efdp.exe'}]}), 'Examfdp.exe');
});
test('model links cannot address authenticated resources or execute script', () => {
  for (const url of ['javascript:alert(1)', '/api/family/private', 'data:text/html,hi', '//evil.example'])
    assert.equal(safeMarkdownUrl(url), '');
  assert.equal(safeMarkdownUrl('https://example.org/lesson'), 'https://example.org/lesson');
});
