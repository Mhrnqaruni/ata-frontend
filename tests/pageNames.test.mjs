// Page names (Phase 1.34 SOT-1): every route in App.jsx has a name in PAGES and every name has its route, so a
// route added without a name fails here; pageFor() gives a raw path's name and pattern, never the path.
// Area: platform
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PAGES, pageFor } from '../src/services/pages.js';

const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
const routes = [...app.matchAll(/<Route\b[^>]*?\bpath="([^"]+)"/g)].map((match) => match[1]);

test('every route in App.jsx has a page name, and every page name has its route', () => {
  const named = PAGES.map((page) => page.path);
  assert.ok(routes.length > 0, "no <Route path> found in App.jsx: this test can't read it");
  assert.deepEqual(
    routes.filter((path) => !named.includes(path)),
    [],
    'add these App.jsx routes to PAGES in src/services/pages.js'
  );
  assert.deepEqual(
    named.filter((path) => !routes.includes(path)),
    [],
    'these PAGES have no route in App.jsx'
  );
});

test('page names are unique, lowercase and dotted', () => {
  const names = PAGES.map((page) => page.name);
  assert.equal(new Set(names).size, names.length);
  for (const name of names) assert.match(name, /^[a-z_]+(?:[.-][a-z_]+)*$/);
});

test('pageFor() names a raw path by its pattern, with ids, codes and tokens left out', () => {
  const cases = {
    '/': ['home', '/'],
    '/classes/3f9c2a1b-8d7e': ['classes.detail', '/classes/:class_id'],
    '/assessments/job_fe79e4e2/review/stu-42': ['assessments.review', '/assessments/:job_id/review/:entity_id'],
    '/assessments/new': ['assessments.new', '/assessments/new'],
    '/quiz/join/ABC123': ['quiz.join.code', '/quiz/join/:roomCode'],
    '/report/SECRET-share-token': ['report', '/report/:report_token'],
    '/chat': ['chat', '/chat/:sessionId?'],
    '/chat/41': ['chat', '/chat/:sessionId?'],
    '/no/such/page': ['not_found', '*'],
  };
  for (const [path, [name, route]] of Object.entries(cases)) assert.deepEqual(pageFor(path), { name, route }, path);
});
