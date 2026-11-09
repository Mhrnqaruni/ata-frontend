// Parent mode's sections (Phase 1.37 S3.1; C-11, C-13; design §3.2, §3.3, §3.8): where each kind's results open,
// the side panel's and the phone bar's sections, and a route and a page name for every section.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { PAGES } from '../src/services/pages.js';

// sections.js as written, with MUI's icons as stand-ins.
const bundle = await build({
  entryPoints: ['src/areas/family/sections.js'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
  plugins: [
    {
      name: 'icons',
      setup(build) {
        build.onResolve({ filter: /^@mui\/icons-material\// }, (args) => ({ path: args.path, namespace: 'icon' }));
        build.onLoad({ filter: /.*/, namespace: 'icon' }, () => ({ contents: 'export default function Icon() {}' }));
      },
    },
  ],
});
// The bundle imports nothing, so it loads straight from memory.
const { SECTIONS, RESULT_SEGMENTS, resultPath, sectionOf } = await import(
  `data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`
);
const labels = (sections) => sections.map((section) => section.label);

test("each kind's results open under its section, and explanations under the Notebook", () => {
  assert.deepEqual(RESULT_SEGMENTS, {
    check: 'homework',
    quiz: 'quizzes',
    flashcards: 'flashcards',
    mindmap: 'mind-maps',
    story: 'stories',
    learn: 'notebook/explanations',
  });
  assert.equal(resultPath('child 1', { kind: 'mindmap', id: 'a1' }), '/family/children/child%201/mind-maps/a1');
  assert.equal(resultPath('c1', { kind: 'check', id: 'a2' }), '/family/children/c1/homework/a2');
  assert.equal(resultPath('c1', { kind: 'learn', id: 'a3' }), '/family/children/c1/notebook/explanations/a3');
  // A kind with no section opens the child's page.
  assert.equal(resultPath('c1', { kind: 'chat', id: 'a4' }), '/family/children/c1');
});

test('the phone bar is Home · Assistant · Homework · Activities; the panel groups the four kinds under Activities', () => {
  assert.deepEqual(labels(SECTIONS.filter((section) => section.phone)), [
    'Home',
    'Assistant',
    'Homework',
    'Activities',
  ]);
  assert.deepEqual(labels(SECTIONS.filter((section) => !section.group && section.panel !== false)), [
    'Home',
    'Assistant',
    'Homework',
  ]);
  assert.deepEqual(labels(SECTIONS.filter((section) => section.group === 'activities')), [
    'Quizzes',
    'Flashcards',
    'Mind maps',
    'Stories',
  ]);
  // A kind's page and its results are in its section, which the phone's Activities item covers.
  assert.equal(sectionOf('/family/children/c1/mind-maps').group, 'activities');
  assert.equal(sectionOf('/family/children/c1/quizzes/a1').id, 'quizzes');
  assert.equal(sectionOf('/family/children/c1/activities').id, 'activities');
});

test('every section has its route in App.jsx and its page name in PAGES', async () => {
  const app = await readFile(new URL('../src/App.jsx', import.meta.url), 'utf8');
  const routes = [...app.matchAll(/<Route\b[^>]*?\bpath="([^"]+)"/g)].map((match) => match[1]);
  for (const section of SECTIONS) {
    const path = ['/family/children/:child_id', section.segment].filter(Boolean).join('/');
    assert.ok(routes.includes(path), `no route for ${path}`);
    assert.equal(PAGES.find((page) => page.path === path)?.name, section.page, path);
  }
});
