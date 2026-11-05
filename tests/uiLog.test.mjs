// The UI log (Phase 1.34 S2.2 and S2.3): the collector's batches, flushes and off switch, then the page views'
// ready rule (D-5, QA-2), page ends and web vitals. No server, no browser: fake timers, storage and beacons.
// Area: platform
import test, { after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

// web-vitals is stood in for: it keeps each metric's callback, for a test to call.
const vitals = new Map();
globalThis.vitalCallbacks = vitals;
const dir = await mkdtemp(path.join(process.cwd(), '.ui-log-test-'));
after(() => rm(dir, { recursive: true, force: true }));
const outfile = path.join(dir, 'runtime.mjs');
await build({
  stdin: {
    contents: `export * from './src/services/uiLog.js'; export * from './src/services/pageViews.js';
export * from './src/services/webVitals.js';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  outfile,
  plugins: [
    {
      name: 'stand-in-web-vitals',
      setup(build) {
        build.onResolve({ filter: /^web-vitals\// }, () => ({ path: 'web-vitals', namespace: 'stand-in' }));
        build.onLoad({ filter: /.*/, namespace: 'stand-in' }, () => ({
          contents: ['CLS', 'FCP', 'INP', 'LCP', 'TTFB']
            .map(
              (metric) => `export const on${metric} = (report) => globalThis.vitalCallbacks.set('${metric}', report);`
            )
            .join('\n'),
          loader: 'js',
        }));
      },
    },
  ],
});
// Each import with its own query is a fresh copy of the modules, as a new page load would be.
const load = (copy) => import(`${pathToFileURL(outfile).href}?${copy}`);

// A browser just big enough: storage, visibility, frames, sendBeacon and fetch, on a clock the test moves.
const storage = () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
  };
};
globalThis.sessionStorage = storage();
globalThis.localStorage = storage();
globalThis.window = new EventTarget();
window.location = { pathname: '/classes/3f9c2a1b', href: 'http://app.test/classes/3f9c2a1b', host: 'app.test' };
globalThis.document = Object.assign(new EventTarget(), { visibilityState: 'visible' });
const beacons = [];
const fetches = [];
let beaconTakes = true; // false: the browser refuses, as with a full beacon queue
Object.defineProperty(globalThis, 'navigator', {
  configurable: true,
  value: {
    sendBeacon(url, body) {
      beacons.push({ url, body: JSON.parse(body), bytes: Buffer.byteLength(body) });
      return beaconTakes;
    },
  },
});
globalThis.fetch = async (url, init) => {
  fetches.push({ url, init, body: JSON.parse(init.body) });
  return { status: 204 };
};
let frames = true; // false: a hidden tab paints no frames
globalThis.requestAnimationFrame = (paint) => frames && setTimeout(paint, 16);
// Node's own PerformanceObserver stays out (files, frames and slow clicks are tests/uiLogElements.test.mjs's), and
// so does its BroadcastChannel: queryCache.js would open one, which keeps the test from exiting.
globalThis.PerformanceObserver = undefined;
globalThis.BroadcastChannel = undefined;
Object.defineProperty(globalThis, 'performance', { configurable: true, value: { now: () => Date.now() } });
mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
// The mock runs a tick's timers at its end time, so the clock moves 1 ms at a time to time each one exactly.
const wait = (ms) => {
  for (let i = 0; i < ms; i++) mock.timers.tick(1);
};
const visibility = (state) => {
  document.visibilityState = state;
  document.dispatchEvent(new Event('visibilitychange'));
  window.dispatchEvent(new Event('visibilitychange')); // as the event bubbles from document to window
};
const hideAndShow = () => {
  visibility('hidden');
  visibility('visible');
};
const sent = (name) => [...beacons, ...fetches].flatMap(({ body }) => body.events).filter((e) => e.name === name);

const on = await load('collector');
on.installUiLog('http://api.test/', undefined);

test('events go in one batch at 20, with the tab id, to /api/client-events', () => {
  const before = beacons.length;
  for (let i = 0; i < 19; i++) on.logEvent('test.batch', { i });
  assert.equal(beacons.length, before);
  on.logEvent('test.batch', { i: 19 });
  assert.equal(beacons.length, before + 1);
  const { url, body } = beacons.at(-1);
  assert.equal(url, 'http://api.test/api/client-events');
  assert.match(body.session, /^[0-9a-f]{32}$/);
  assert.equal(body.session, sessionStorage.getItem('mst.session'));
  assert.deepEqual(
    body.events.map((event) => event.i),
    [...Array(20).keys()]
  );
});

test('only strings (cut to 300 characters), finite numbers and booleans are kept', () => {
  const fields = { text: 'x'.repeat(400), n: 1.5, yes: false, nan: NaN, big: Infinity, none: null, list: [1], obj: {} };
  on.logEvent('test.values', { ...fields, missing: undefined });
  hideAndShow();
  assert.deepEqual(sent('test.values'), [{ name: 'test.values', text: 'x'.repeat(300), n: 1.5, yes: false }]);
});

test('anything queued goes within 10 s, and at once when the tab is hidden or the page is left', () => {
  const before = beacons.length;
  on.logEvent('test.timer', {});
  wait(9999);
  assert.equal(beacons.length, before);
  wait(1);
  assert.equal(sent('test.timer').length, 1);
  on.logEvent('test.hidden', {});
  hideAndShow();
  assert.equal(sent('test.hidden').length, 1);
  on.logEvent('test.left', {});
  window.dispatchEvent(new Event('pagehide'));
  assert.equal(sent('test.left').length, 1);
});

test('a big queue goes in batches under 60 KB, and fetch with keepalive takes what sendBeacon refuses', () => {
  const before = beacons.length;
  const big = Object.fromEntries(Array.from({ length: 15 }, (_, i) => [`field${i}`, 'é'.repeat(300)])); // 9 KB
  for (let i = 0; i < 19; i++) on.logEvent('test.big', big);
  hideAndShow();
  const batches = beacons.slice(before).filter(({ body }) => body.events.some((e) => e.name === 'test.big'));
  assert.ok(batches.length >= 3, `${batches.length} batches`);
  for (const { bytes, body } of batches) assert.ok(bytes < 60000 && body.events.length <= 50, `${bytes} bytes`);
  assert.equal(sent('test.big').length, 19);

  beaconTakes = false;
  on.logEvent('test.refused', {});
  hideAndShow();
  beaconTakes = true;
  const [{ url, init }] = fetches.filter(({ body }) => body.events.some((e) => e.name === 'test.refused'));
  assert.equal(url, 'http://api.test/api/client-events');
  assert.deepEqual(
    { ...init, body: undefined },
    {
      method: 'POST',
      body: undefined,
      keepalive: true,
      credentials: 'omit',
      headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
    }
  );
});

test('nothing is queued or sent when the tab is switched off or sampled out, but the tab id still is', async () => {
  localStorage.setItem('mst.uiLog', 'off');
  const off = await load('off');
  off.installUiLog('http://api.test', undefined);
  localStorage.removeItem('mst.uiLog');
  const sampledOut = await load('sampled-out');
  sampledOut.installUiLog('http://api.test', '0');
  for (const copy of [off, sampledOut]) for (let i = 0; i < 25; i++) copy.logEvent('test.off', { i });
  hideAndShow();
  window.dispatchEvent(new Event('pagehide'));
  wait(10000);
  assert.equal(sent('test.off').length, 0);
  assert.equal(off.uiSessionId(), sessionStorage.getItem('mst.session')); // client errors still carry it
});

// The page views get their own copy, logging to `seen`, on a clock back at the navigation's start.
const pv = await load('page-views');
const seen = [];
const lines = (name) => seen.filter((line) => line.name === name);
const viewOf = (page) => lines('browser.page_view').find((line) => line['app.screen.name'] === page);

test('a first load is ready at the frame after its last load ends, once nothing starts for 500 ms', () => {
  mock.timers.reset();
  mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
  pv.startPageViews((name, fields) => seen.push({ name, ...fields }));
  wait(100);
  const chunk = pv.startActivity(); // the page's chunk, while React renders
  wait(50);
  pv.routeChanged({ pathname: '/classes/3f9c2a1b', navigation: 'POP', at: 150 }); // the first render
  wait(250);
  chunk(); // 400 ms: quiet from here...
  wait(50);
  const call = pv.startActivity(); // ...until a call starts within 500 ms
  wait(450);
  call(); // 900 ms, then the frame at 916 ms
  assert.equal(lines('browser.page_view').length, 0);
  wait(516);
  const [view] = lines('browser.page_view');
  assert.match(view['mst.page.view_id'], /^[0-9a-f]{16}$/);
  assert.deepEqual(view, {
    name: 'browser.page_view',
    'mst.page.view_id': view['mst.page.view_id'],
    'app.screen.name': 'classes.detail',
    'url.template': '/classes/:class_id',
    'mst.page.nav': 'load',
    'mst.page.ready_ms': 916,
    'mst.page.ready_timeout': false,
    'mst.page.left_before_ready': false,
    'mst.page.hidden': false,
    'mst.page.api_count': 0,
    'mst.page.api_ms': 0,
    'mst.page.files': 0,
    'mst.page.files_cached': 0,
    'mst.page.download_kb': 0,
    'mst.query.cached': 0,
    'mst.query.fetched': 0,
    'mst.page.long_frames_ms': 0,
    'mst.app.version': 'runtime.mjs',
  });
});

test('a route change ends the view with its time on page, then times the next view from the change', () => {
  wait(584); // 2000 ms
  pv.routeChanged({ pathname: '/assessments', navigation: 'PUSH', at: 2000 });
  wait(516);
  assert.deepEqual(
    seen.slice(-2).map((line) => [line.name, line['app.screen.name']]),
    [
      ['browser.page_end', 'classes.detail'],
      ['browser.page_view', 'assessments'],
    ]
  );
  assert.equal(lines('browser.page_end')[0]['mst.page.duration_ms'], 2000);
  assert.equal(viewOf('assessments')['mst.page.nav'], 'route');
  assert.equal(viewOf('assessments')['mst.page.ready_ms'], 16);
});

test("a view left before it's ready says so, with no ready time; the next waits only for its own loads", () => {
  const slow = pv.startActivity(); // a call /assessments leaves running
  wait(84); // 2600 ms
  pv.routeChanged({ pathname: '/classes', navigation: 'PUSH', at: 2600 });
  const call = pv.startActivity(); // /classes' own call
  wait(200);
  pv.routeChanged({ pathname: '/', navigation: 'POP', at: 2800 }); // back, before /classes was ready
  wait(100);
  slow();
  call();
  wait(416);
  assert.equal(viewOf('classes')['mst.page.left_before_ready'], true);
  assert.equal(viewOf('classes')['mst.page.ready_ms'], undefined);
  assert.equal(lines('browser.page_end').at(-1)['mst.page.duration_ms'], 200);
  assert.equal(viewOf('home')['mst.page.nav'], 'back_forward');
  assert.equal(viewOf('home')['mst.page.ready_ms'], 16); // the earlier pages' calls didn't hold it up
});

test('a view hidden before it is ready is flagged, with its frame raced against 100 ms', () => {
  frames = false;
  visibility('hidden');
  pv.routeChanged({ pathname: '/quizzes', navigation: 'PUSH', at: performance.now() });
  wait(600);
  assert.equal(viewOf('quizzes')['mst.page.hidden'], true);
  assert.equal(viewOf('quizzes')['mst.page.ready_ms'], 100);
  frames = true;
  visibility('visible');
});

test('a view still loading after 30 s is sent as timed out', () => {
  pv.routeChanged({ pathname: '/tools', navigation: 'PUSH', at: performance.now() });
  const hang = pv.startActivity();
  wait(30000);
  assert.equal(viewOf('tools')['mst.page.ready_timeout'], true);
  assert.equal(viewOf('tools')['mst.page.ready_ms'], 30000);
  hang();
});

test('a redirect before the view is ready keeps timing it, under the page it lands on', () => {
  pv.routeChanged({ pathname: '/admin', navigation: 'PUSH', at: performance.now() });
  const call = pv.startActivity();
  wait(200);
  pv.routeChanged({ pathname: '/', navigation: 'REPLACE', at: performance.now() });
  call();
  wait(516);
  assert.equal(viewOf('admin'), undefined);
  assert.equal(lines('browser.page_view').at(-1)['app.screen.name'], 'home');
  assert.equal(lines('browser.page_view').at(-1)['mst.page.ready_ms'], 216);
});

test('web vitals are logged with their OpenTelemetry names, attribution and the file address without a query', () => {
  pv.startWebVitals();
  vitals.get('LCP')({
    name: 'LCP',
    value: 1234.6,
    delta: 1234.6,
    id: 'v6-1-2',
    rating: 'needs-improvement',
    navigationType: 'navigate',
    attribution: {
      target: 'main>img.logo',
      url: 'http://app.test/assets/logo.png?v=2',
      timeToFirstByte: 100.4,
      resourceLoadDelay: 20,
      resourceLoadDuration: 300.6,
      elementRenderDelay: 50,
      lcpEntry: { element: 'not logged' },
    },
  });
  const opts = { id: 'v6-3', rating: 'poor', navigationType: 'reload' };
  vitals.get('CLS')({ name: 'CLS', value: 0.123456, delta: 0.1, ...opts, attribution: { largestShiftValue: 0.09999 } });
  const [lcp, cls] = lines('browser.web_vital');
  assert.deepEqual(lcp, {
    name: 'browser.web_vital',
    'mst.page.view_id': lcp['mst.page.view_id'],
    'app.screen.name': 'home',
    'url.template': '/',
    'browser.web_vital.name': 'lcp',
    'browser.web_vital.value': 1235,
    'browser.web_vital.delta': 1235,
    'browser.web_vital.id': 'v6-1-2',
    'browser.web_vital.rating': 'needs-improvement',
    'browser.web_vital.navigation_type': 'navigate',
    'mst.vital.target': 'main>img.logo',
    'mst.vital.url': '/assets/logo.png',
    'mst.vital.time_to_first_byte': 100,
    'mst.vital.resource_load_delay': 20,
    'mst.vital.resource_load_duration': 301,
    'mst.vital.element_render_delay': 50,
  });
  assert.equal(cls['browser.web_vital.name'], 'cls');
  assert.equal(cls['browser.web_vital.value'], 0.1235);
  assert.equal(cls['mst.vital.largest_shift_value'], 0.1);
});
