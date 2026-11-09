// A result's actions (Phase 1.37, S3.3b; C-14, C-24, design §3.10): where Ask about this, Explain in chat and Practise
// with a quiz go, and that none of them changes an existing chat's materials.
// Area: family
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// The actions as written, bundled so their imports resolve (as tests/sections.test.mjs does).
const bundle = await build({
  entryPoints: ['src/areas/family/results/resultActions.js'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'error',
});
const { askAbout, explainInChat, practise } = await import(
  `data:text/javascript,${encodeURIComponent(bundle.outputFiles[0].text)}`
);

const child = { id: 'c1', displayName: 'Sam' };
// A stand-in for familyApi that records every call.
function stubApi(chats = []) {
  const calls = [];
  const api = {
    newChat: async (...args) => calls.push(['newChat', ...args]),
    chat: async (...args) => (calls.push(['chat', ...args]), { revision: 1 }),
    updateChat: async (...args) => calls.push(['updateChat', ...args]),
    chats: async (...args) => (calls.push(['chats', ...args]), { items: chats }),
  };
  return { api, calls };
}
const recorder = () => {
  const trips = [];
  return { trips, go: (to, options) => trips.push([to, options?.state]) };
};

test('Ask about this opens the item’s own chat with the drafted question, and changes nothing there', async () => {
  const { api, calls } = stubApi();
  const { trips, go } = recorder();
  await askAbout({
    api,
    activity: { id: 'q1', conversationId: 'k7', materialIds: ['m1'] },
    child,
    label: 'Fractions',
    go,
  });
  assert.deepEqual(calls, []);
  assert.equal(trips[0][0], '/family/children/c1/notebook?chat=k7');
  assert.equal(trips[0][1].suggestion.text, 'Help me explain Fractions to Sam in a simple way.');
  assert.equal(trips[0][1].suggestion.send, undefined);
});

test('an item with no chat gets a new chat holding its materials', async () => {
  const { api, calls } = stubApi();
  const { trips, go } = recorder();
  const chat = await askAbout({
    api,
    activity: { id: 'q1', materialIds: ['m1', 'm2'] },
    child,
    label: 'Fractions',
    go,
  });
  assert.deepEqual(
    calls.map(([name]) => name),
    ['newChat', 'chat', 'updateChat']
  );
  assert.deepEqual(calls[2], ['updateChat', 'c1', chat, { revision: 1, materialIds: ['m1', 'm2'] }]);
  assert.equal(trips[0][0], `/family/children/c1/notebook?chat=${chat}`);
});

test('a retry after a failure reuses the new chat, so it makes only one', async () => {
  const { api, calls } = stubApi();
  const { trips, go } = recorder();
  let fail = true;
  const chat = api.chat;
  api.chat = async (...args) => {
    if (fail) throw new Error('offline');
    return chat(...args);
  };
  const ask = () => askAbout({ api, activity: { id: 'q1', materialIds: ['m1'] }, child, label: 'X', go, newId: 'n1' });
  await assert.rejects(ask);
  fail = false;
  assert.equal(await ask(), 'n1');
  assert.deepEqual(
    calls.filter(([name]) => name === 'newChat'),
    [
      ['newChat', 'c1', 'n1'],
      ['newChat', 'c1', 'n1'],
    ]
  );
  assert.equal(trips.length, 1);
});

test('Explain in chat goes to the chat the parent came from, else the latest', async () => {
  const first = stubApi([{ id: 'latest' }]);
  const a = recorder();
  await explainInChat({ api: first.api, child, from: '/family/children/c1/notebook?chat=k3', text: 'Why?', go: a.go });
  assert.deepEqual(first.calls, []);
  assert.equal(a.trips[0][0], '/family/children/c1/notebook?chat=k3');
  assert.equal(a.trips[0][1].suggestion.send, true);

  const second = stubApi([{ id: 'latest' }]);
  const b = recorder();
  await explainInChat({ api: second.api, child, from: '/family/children/c1/homework', text: 'Why?', go: b.go });
  assert.deepEqual(
    second.calls.map(([name]) => name),
    ['chats']
  );
  assert.equal(b.trips[0][0], '/family/children/c1/notebook?chat=latest');
});

test('Practise with a quiz opens the Quizzes page’s dialog with the item’s materials, and no chat request', () => {
  const { trips, go } = recorder();
  // A check keeps its homework upload ticked.
  practise({ activity: { id: 'h1', kind: 'check', materialId: 'upload-1', settings: {} }, child, go });
  assert.deepEqual(
    trips.map(([to]) => to),
    ['/family/children/c1/quizzes', '/family/children/c1/quizzes?dialog=make-quiz']
  );
  assert.deepEqual(trips[1][1].make, { materialIds: ['upload-1'], basis: 'materials', topic: '', fallbackTopic: '' });
  // With no materials, its topic goes in "Describe it".
  const other = recorder();
  practise({ activity: { id: 's1', kind: 'story', settings: { topic: 'Volcanoes' } }, child, go: other.go });
  assert.deepEqual(other.trips[1][1].make, {
    materialIds: [],
    basis: 'topic',
    topic: 'Volcanoes',
    fallbackTopic: 'Volcanoes',
  });
});
