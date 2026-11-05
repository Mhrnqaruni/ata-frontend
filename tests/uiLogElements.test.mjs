// The UI log's elements and clicks (Phase 1.34 S2.4 and S2.5): api.js's browser.api_call lines, files, long frames
// and query counts against their view, with totals that add up (QA-4 included), and names that never hold text.
// Area: platform
import test, { after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import axios from 'axios';
import { QueryObserver } from '@tanstack/react-query';
import React from 'react';
import Renderer, { act } from 'react-test-renderer';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';

const dir = await mkdtemp(path.join(process.cwd(), '.ui-log-elements-test-'));
after(() => rm(dir, { recursive: true, force: true }));
const outfile = path.join(dir, 'runtime.mjs');
await build({
  stdin: {
    contents: `export { default as api } from './src/services/api.js'; export * from './src/services/pageViews.js';
export * from './src/services/pageElements.js'; export * from './src/services/uiNames.js';
export { queryClient } from './src/services/queryCache.js';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  outfile,
  define: { 'import.meta.env.VITE_API_BASE_URL': '"http://offline.invalid"' },
});

// A browser just big enough: a page, observers the test fires by hand, frames, on a clock the test moves.
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.BroadcastChannel = undefined;
globalThis.window = new EventTarget();
window.location = {
  pathname: '/classes/3f9c2a1b',
  href: 'http://app.test/',
  host: 'app.test',
  origin: 'http://app.test',
};
const handlers = {};
globalThis.document = { visibilityState: 'visible', addEventListener: (type, fn) => (handlers[type] = fn) };
const observers = {};
globalThis.PerformanceObserver = class {
  static supportedEntryTypes = ['resource', 'long-animation-frame', 'event'];
  constructor(callback) {
    this.callback = callback;
  }
  observe({ type }) {
    observers[type] = (entries) => this.callback({ getEntries: () => entries });
  }
};
globalThis.requestAnimationFrame = (paint) => setTimeout(paint, 16);
Object.defineProperty(globalThis, 'performance', {
  configurable: true,
  value: { now: () => Date.now(), setResourceTimingBufferSize() {} },
});
mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 0 });
const wait = (ms) => {
  for (let i = 0; i < ms; i++) mock.timers.tick(1);
};

const ui = await import(pathToFileURL(outfile));
const { api, queryClient } = ui;
// The lines as the collector keeps them: strings, booleans and finite numbers only.
const seen = [];
const kept = ([, value]) => typeof value === 'string' || typeof value === 'boolean' || Number.isFinite(value);
ui.startPageViews((name, fields) => seen.push(Object.fromEntries(Object.entries({ name, ...fields }).filter(kept))));
ui.startPageElements();
ui.startInteractions();
const lines = (name) => seen.filter((line) => line.name === name);
const answer = (config, ms, headers = {}) => {
  wait(ms); // the call takes this long
  return { config, status: 200, statusText: 'OK', data: {}, headers };
};

test('each API call writes browser.api_call: its own id, a QA-7 path, the status and the Server-Timing split', async () => {
  ui.routeChanged({ pathname: '/classes/3f9c2a1b', navigation: 'POP', at: 0 }); // the first render
  let sentId;
  const timing = 'app;dur=12.3, db;dur=4.5;desc="3", dbwait;dur=0.4';
  api.defaults.adapter = async (config) => {
    sentId = config.headers['X-Request-ID'];
    return answer(config, 40, { 'server-timing': timing, 'content-length': '512' });
  };
  await api.get('/api/classes/3f9c2a1b-77/students?page=2');
  const [call] = lines('browser.api_call');
  assert.deepEqual(call, {
    name: 'browser.api_call',
    'mst.page.view_id': call['mst.page.view_id'],
    'app.screen.name': 'classes.detail',
    'url.template': '/classes/:class_id',
    trace_id: sentId,
    'http.request.method': 'GET',
    'url.path': '/api/classes/:id/students',
    'http.response.status_code': 200,
    duration_ms: 40,
    'http.response.body.size': 512,
    'mst.server_ms': 12.3,
    'mst.db_ms': 4.5,
    'mst.db_queries': 3,
    'mst.db_wait_ms': 0.4,
    'mst.network_ms': 27.7,
    'mst.start_ms': 0,
  });
});

test('a failed call has error.type: its status, or the network error', async () => {
  api.defaults.adapter = async (config) => {
    wait(10);
    const response = { config, status: 404, headers: {}, data: {} };
    throw new axios.AxiosError('Request failed', 'ERR_BAD_REQUEST', config, null, response);
  };
  await api.get('/api/public/report/SECRET-share-token').catch(() => {});
  api.defaults.adapter = async (config) => {
    throw new axios.AxiosError('Network Error', 'ERR_NETWORK', config);
  };
  await api.post('/api/classes').catch(() => {});
  const [missing, offline] = lines('browser.api_call').slice(-2);
  assert.equal(missing['url.path'], '/api/public/report/***');
  assert.equal(missing['http.response.status_code'], 404);
  assert.equal(missing['error.type'], '404');
  assert.equal(offline['http.request.method'], 'POST');
  assert.equal(offline['error.type'], 'ERR_NETWORK');
  assert.equal('http.response.status_code' in offline || 'mst.network_ms' in offline, false);
});

const file = (url, fields) => ({
  name: url,
  initiatorType: 'script',
  duration: fields.responseEnd - fields.startTime,
  transferSize: 0,
  encodedBodySize: 0,
  responseStart: 1,
  requestStart: 0,
  ...fields,
});

test("a view's files, frames and queries are its own, a file ending in its quiet window moves its ready time (QA-4), and its totals add up", async () => {
  wait(1000);
  const t0 = performance.now();
  ui.routeChanged({ pathname: '/assessments', navigation: 'PUSH', at: t0 });
  api.defaults.adapter = async (config) => answer(config, 300);
  await api.get('/api/assessments'); // ends at 300 ms: quiet from here...
  queryClient.setQueryData(['cached'], [1]);
  const stop = new QueryObserver(queryClient, { queryKey: ['cached'], staleTime: Infinity }).subscribe(() => {});
  await queryClient.fetchQuery({ queryKey: ['fetched'], queryFn: async () => [2] });
  wait(310); // ...but the browser reports the files a little after they end, the logo at 600 ms
  observers.resource([
    file('http://app.test/assets/index-a1.js', {
      startTime: t0 + 5,
      responseEnd: t0 + 200,
      transferSize: 300,
      encodedBodySize: 50000,
    }),
    file('http://app.test/assets/logo.png?v=2', {
      initiatorType: 'img',
      startTime: t0 + 20,
      requestStart: t0 + 25,
      responseEnd: t0 + 600,
      transferSize: 344000,
      encodedBodySize: 343700,
    }),
    file('http://app.test/assets/chunk.js', { startTime: t0 + 30, responseEnd: t0 + 60, encodedBodySize: 1200 }),
    file('https://fonts.example/f.woff2?v=1', {
      initiatorType: 'css',
      startTime: t0 + 40,
      responseEnd: t0 + 90,
      responseStart: 0,
    }),
    file('http://offline.invalid/api/assessments', {
      initiatorType: 'xmlhttprequest',
      startTime: t0,
      responseEnd: t0 + 300,
    }),
    file('http://offline.invalid/api/client-events', { initiatorType: 'beacon', startTime: t0, responseEnd: t0 + 9 }),
  ]);
  const script = {
    duration: 90,
    sourceURL: 'http://app.test/assets/index-a1.js?x=1',
    sourceFunctionName: 'renderMath',
  };
  const frame = { startTime: t0 + 100, duration: 120, blockingDuration: 70 };
  observers['long-animation-frame']([{ ...frame, scripts: [{ ...script, invoker: 'BUTTON#delete-42.onclick' }] }]);
  wait(1100);
  stop();

  const view = lines('browser.page_view').at(-1);
  const own = (name) => lines(name).filter((line) => line['mst.page.view_id'] === view['mst.page.view_id']);
  assert.equal(view['app.screen.name'], 'assessments');
  assert.equal(view['mst.page.ready_ms'], 626); // the logo's end, then the frame, not the call's end (316)
  const files = own('browser.resource');
  assert.deepEqual(
    files.map((line) => [line['mst.resource.name'], line['mst.cache'], line['mst.start_ms']]),
    [
      ['/assets/index-a1.js', 'revalidated', 5],
      ['/assets/logo.png', 'network', 20],
      ['/assets/chunk.js', 'cache', 30],
      ['fonts.example/f.woff2', 'unknown', 40],
    ]
  );
  assert.equal(files[1]['mst.resource.queue_ms'], 5);
  const [long] = own('browser.long_frame');
  assert.equal(long['mst.frame.script'], '/assets/index-a1.js:renderMath');
  assert.equal(long['mst.frame.invoker'], 'BUTTON.onclick'); // the element's id is left out
  assert.equal(long['mst.start_ms'], 100);
  const calls = own('browser.api_call');
  assert.deepEqual(
    {
      api_count: view['mst.page.api_count'],
      api_ms: view['mst.page.api_ms'],
      files: view['mst.page.files'],
      files_cached: view['mst.page.files_cached'],
      download_kb: view['mst.page.download_kb'],
      long_frames_ms: view['mst.page.long_frames_ms'],
      cached: view['mst.query.cached'],
      fetched: view['mst.query.fetched'],
    },
    {
      api_count: calls.length,
      api_ms: calls.reduce((sum, line) => sum + line.duration_ms, 0),
      files: files.length,
      files_cached: files.filter((line) => ['cache', 'revalidated'].includes(line['mst.cache'])).length,
      download_kb: Math.round(files.reduce((sum, line) => sum + line['mst.resource.transfer_bytes'], 0) / 102.4) / 10,
      long_frames_ms: long.duration_ms,
      cached: 1,
      fetched: 1,
    }
  );

  // Files started after the view was ready aren't its own, and a view logs at most 20 long frames.
  const late = file('http://app.test/assets/late.png', {
    initiatorType: 'img',
    startTime: t0 + 700,
    responseEnd: t0 + 900,
  });
  observers.resource([late]);
  observers['long-animation-frame'](
    Array.from({ length: 25 }, (_, i) => ({ ...frame, startTime: t0 + 1000 + i * 200 }))
  );
  assert.equal(own('browser.resource').length, 4);
  assert.equal(own('browser.long_frame').length, 20);
});

// A DOM element just big enough to name: a tag, attributes and a parent.
const el = (tag, attrs = {}, parent = null) => ({
  tagName: tag.toUpperCase(),
  id: attrs.id ?? '',
  parentElement: parent,
  getAttribute: (key) => attrs[key] ?? null,
  hasAttribute: (key) => key in attrs,
});

test('clicks and submits are named by data-mst, target page, field name, stable id or role, after the nearest named ancestor', () => {
  const before = seen.length;
  const main = el('main');
  const sidebar = el('nav', { 'data-mst': 'sidebar', 'aria-label': 'Main' });
  const confirm = el('div', { role: 'dialog', 'data-mst': 'confirm-dialog' });
  const dialog = el('div', { role: 'dialog' });
  const cases = [
    [
      el('span', {}, el('a', { href: '/classes/3f9c2a1b', 'aria-label': 'Ada Lovelace' }, sidebar)),
      'sidebar/link:classes.detail',
    ],
    [
      el('svg', {}, el('button', { 'data-mst': 'cancel', title: 'Cancel deleting Ada' }, confirm)),
      'confirm-dialog/cancel',
    ],
    [el('input', { name: 'email', value: 'ada@example.com' }, main), 'main/input:email'],
    [el('button', { id: 'save-draft' }, main), 'main/button#save-draft'],
    [el('button', { id: ':r3:' }, dialog), 'dialog/button'],
    [el('div', { role: 'tab', id: 'tab-2' }, main), 'main/tab'],
    [el('a', { href: 'https://elsewhere.example/a?b=1' }), 'link:external'],
  ];
  for (const [target] of cases) handlers.click({ type: 'click', target });
  handlers.click({ type: 'click', target: el('p', {}, main) }); // plain text: nothing to name
  handlers.submit({ type: 'submit', target: el('form', { role: 'dialog', 'data-mst': 'rename-dialog' }) });
  const logged = seen.slice(before);
  assert.deepEqual(
    logged.map((line) => [line['app.widget.id'], line['mst.ui.action']]),
    [...cases.map(([, name]) => [name, 'click']), ['rename-dialog', 'submit']]
  );
  assert.doesNotMatch(JSON.stringify(logged), /Ada|@|SECRET|\?/);
});

test('an interaction of 200 ms or more is logged once, from its longest event, with its three parts', () => {
  const before = seen.length;
  const target = el('button', { 'data-mst': 'save' }, el('div', { role: 'dialog', 'data-mst': 'rename-dialog' }));
  const event = { interactionId: 7, startTime: 1000, target };
  observers.event([
    { ...event, name: 'pointerdown', duration: 216, processingStart: 1010, processingEnd: 1150 },
    { ...event, name: 'click', duration: 240, processingStart: 1016, processingEnd: 1196 },
    { ...event, name: 'mouseover', interactionId: 0, duration: 300, processingStart: 1000, processingEnd: 1290 },
  ]);
  observers.event([{ ...event, name: 'pointerup', duration: 232, processingStart: 1012, processingEnd: 1100 }]);
  const slow = seen.slice(before);
  assert.deepEqual(slow, [
    {
      name: 'browser.slow_interaction',
      'mst.page.view_id': slow[0]['mst.page.view_id'],
      'app.screen.name': 'assessments',
      'url.template': '/assessments',
      'app.widget.id': 'rename-dialog/save',
      'mst.ui.action': 'click',
      duration_ms: 240,
      'mst.ui.input_delay_ms': 16,
      'mst.ui.processing_ms': 180,
      'mst.ui.presentation_ms': 44,
    },
  ]);
});

test("a file is cache with nothing moved, revalidated on a 304 (deliveryType 'cache' with bytes moved), else network", () => {
  const entry = (fields) => ({ transferSize: 0, encodedBodySize: 0, responseStart: 1, ...fields });
  assert.equal(ui.cacheOf(entry({ encodedBodySize: 1200, deliveryType: 'cache' })), 'cache'); // no request at all
  // A 304: Resource Timing says 'cache' for validated responses too, so the bytes moved decide (QA's R4 finding).
  assert.equal(ui.cacheOf(entry({ transferSize: 300, encodedBodySize: 50000, deliveryType: 'cache' })), 'revalidated');
  // A tiny file's 304 moves more bytes (its headers) than its body, but is still revalidated.
  assert.equal(ui.cacheOf(entry({ transferSize: 300, encodedBodySize: 200, deliveryType: 'cache' })), 'revalidated');
  assert.equal(ui.cacheOf(entry({ transferSize: 300, encodedBodySize: 50000 })), 'revalidated'); // no deliveryType
  // Chromium's reload of the same URL, as seen on dev: headers moved, no body reported and no deliveryType.
  assert.equal(ui.cacheOf(entry({ transferSize: 300, encodedBodySize: 0, deliveryType: '' })), 'revalidated');
  assert.equal(ui.cacheOf(entry({ transferSize: 344000, encodedBodySize: 343700, deliveryType: '' })), 'network');
  assert.equal(ui.cacheOf(entry({ responseStart: 0 })), 'unknown'); // another origin, without Timing-Allow-Origin
});

// An adapter that answers only when the test says so, so calls are still loading when the route changes.
const held = () => {
  const waiting = [];
  api.defaults.adapter = (config) =>
    new Promise((resolve) =>
      waiting.push(() => resolve({ config, status: 200, statusText: 'OK', data: {}, headers: {} }))
    );
  return () => waiting.splice(0).forEach((answer) => answer());
};
const interceptorsRun = () => new Promise((resolve) => setImmediate(resolve)); // axios's interceptors are async
const viewCalls = (view) =>
  lines('browser.api_call').filter((line) => line['mst.page.view_id'] === view['mst.page.view_id']);

test('a page whose own effect starts a call on a route change has that call in its new view', async () => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const release = held();
  let go;
  const Quizzes = () => {
    React.useEffect(() => void api.get('/api/quizzes'), []);
    return null;
  };
  const Shell = () => {
    ui.usePageViews();
    go = useNavigate();
    return React.createElement(
      Routes,
      null,
      React.createElement(Route, { path: '/classes', element: null }),
      React.createElement(Route, { path: '/quizzes', element: React.createElement(Quizzes) })
    );
  };
  let root;
  await act(async () => {
    root = Renderer.create(
      React.createElement(MemoryRouter, { initialEntries: ['/classes'] }, React.createElement(Shell))
    );
  });
  wait(1000);
  await act(async () => go('/quizzes')); // the view opens in a layout effect, before the page's own effects
  await interceptorsRun();
  wait(300);
  release();
  await interceptorsRun();
  wait(700);
  const view = lines('browser.page_view').at(-1);
  assert.equal(view['app.screen.name'], 'quizzes');
  assert.deepEqual(
    viewCalls(view).map((line) => line['url.path']),
    ['/api/quizzes']
  );
  assert.ok(view['mst.page.ready_ms'] >= 300, `ready ${view['mst.page.ready_ms']}`);
  await act(async () => root.unmount());
});

test("QA-15: a call the sidebar prefetched on hover is the next page's own if it's still loading, and that page waits for it", async () => {
  ui.routeChanged({ pathname: '/classes', navigation: 'PUSH', at: performance.now() });
  wait(1000);
  const release = held();
  const prefetched = api.get('/api/assessments', { mstPrefetchFor: '/assessments' }); // the pointer enters the link
  const other = api.get('/api/quizzes', { mstPrefetchFor: '/quizzes' }); // a link hovered on the way, not clicked
  await interceptorsRun();
  wait(8); // the click on Assessments, 8 ms later
  ui.routeChanged({ pathname: '/assessments', navigation: 'PUSH', at: performance.now() });
  wait(400);
  release();
  await Promise.allSettled([prefetched, other]);
  wait(700);
  const view = lines('browser.page_view').at(-1);
  assert.equal(view['app.screen.name'], 'assessments');
  // Its own call, started on the hover 8 ms before the view; the other page's prefetch stays where it started.
  assert.deepEqual(
    viewCalls(view).map((line) => [line['url.path'], line['mst.start_ms']]),
    [['/api/assessments', -8]]
  );
  assert.equal(view['mst.page.api_count'], 1);
  assert.ok(view['mst.page.ready_ms'] >= 400, `ready ${view['mst.page.ready_ms']}`);
});
