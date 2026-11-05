// The error reference and browser error reports (Phase 1.33 S1.6): how a reference reads, the one api.js sends
// with each request and keeps on its errors, and what reports carry and how many go. No server, no network.
// Area: platform
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import axios from 'axios';

globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.window = new EventTarget();
window.location = { pathname: '/assessments', href: '' };
globalThis.BroadcastChannel = undefined;
// Reports go to this fake fetch. With `refuse` set, it fails like a browser that refuses the request.
const calls = [];
let refuse = false;
globalThis.fetch = async (url, init) => {
  calls.push({ url, init, body: JSON.parse(init.body) });
  if (refuse) throw new TypeError('Failed to fetch');
  return { status: 204 };
};

// api.js reads VITE_API_BASE_URL from Vite, so bundle it, with clientErrors.js, as one module graph.
const dir = await mkdtemp(path.join(process.cwd(), '.client-errors-test-'));
after(() => rm(dir, { recursive: true, force: true }));
const outfile = path.join(dir, 'runtime.mjs');
await build({
  stdin: {
    contents: `export { default as api, apiError } from './src/services/api.js';
export * from './src/services/clientErrors.js';`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  outfile,
  define: { 'import.meta.env.VITE_API_BASE_URL': '"http://offline.invalid"' },
});
const { api, apiError, formatReference, newRequestId, reportClientError, installClientErrorReporting } = await import(
  pathToFileURL(outfile)
);

const backendId = 'ab12cd34'.repeat(4);
const sentIds = [];
// /ok answers; /missing is a 404 with the backend's reference; /net never reaches us; anything else is a 500.
api.defaults.adapter = async (config) => {
  sentIds.push(config.headers['X-Request-ID']);
  if (config.url === '/ok') return { config, data: {}, status: 200, statusText: 'OK', headers: {} };
  if (config.url === '/net') throw new axios.AxiosError('Network Error', 'ERR_NETWORK', config);
  const missing = config.url === '/missing';
  const response = {
    config,
    status: missing ? 404 : 500,
    headers: missing ? { 'x-request-id': backendId } : {},
    data: { detail: missing ? 'Assessment not found.' : 'Something went wrong on our side.' },
  };
  throw new axios.AxiosError('Request failed', 'ERR_BAD_RESPONSE', config, null, response);
};
const failure = (url, options) => api.get(url, options).catch((error) => error);
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

test('a reference reads as its first 8 characters, XXXX-XXXX, and only for an id the logs can find', () => {
  assert.equal(formatReference('3f9c2a1b8d7e6f5a4b3c2d1e0f9a8b7c'), '3F9C-2A1B');
  assert.equal(formatReference('0A1B2C3D4E5F60718293A4B5C6D7E8F9'), '0A1B-2C3D');
  for (const id of [null, undefined, '', '3f9c2a1', 'job_fe79e4e28d854359', 42])
    assert.equal(formatReference(id), null);
});

test('each new request id is 32 lowercase hex characters', () => {
  const [a, b] = [newRequestId(), newRequestId()];
  assert.match(a, /^[0-9a-f]{32}$/);
  assert.notEqual(a, b);
});

test('each request sends its own reference, and its error keeps the one the logs have', async () => {
  sentIds.length = 0;
  await api.get('/ok');
  const missing = await failure('/missing');
  const broken = await failure('/broken');
  const offline = await failure('/net');
  assert.equal(new Set(sentIds).size, 4);
  sentIds.forEach((id) => assert.match(id, /^[0-9a-f]{32}$/));
  assert.equal(missing.reference, backendId); // the backend's
  assert.equal(broken.reference, sentIds[2]); // no header came back: the one we sent
  assert.equal(offline.reference, undefined); // it never reached us
  // A service's own error keeps the backend's message and the reference.
  assert.equal(apiError(missing, 'Could not load.').message, 'Assessment not found.');
  assert.equal(apiError(missing, 'Could not load.').reference, backendId);
  assert.equal(apiError(offline, 'Could not load.').message, 'Could not load.');
  const invalid = { response: { status: 422, data: { detail: [{ msg: 'Field required' }] } } };
  assert.equal(apiError(invalid, 'Could not load.').message, 'Could not load.'); // a validation list isn't a sentence
  assert.equal(calls.length, 0); // nothing is sent before the app turns reporting on
});

test('a report carries the page path without its query or a report token, and a short message', () => {
  installClientErrorReporting('http://test.invalid');
  window.location = { pathname: '/report/SECRET-share-token', href: '' };
  const long = `TypeError: failed at https://app.test/report/SECRET?token=abc ${'x'.repeat(400)}`;
  const reference = reportClientError({ kind: 'error', message: long });
  window.location = { pathname: '/assessments', href: '' };
  assert.equal(calls.length, 1);
  const [{ url, init, body }] = calls;
  assert.equal(url, 'http://test.invalid/api/client-errors');
  assert.equal(init.method, 'POST');
  assert.equal(init.keepalive, true);
  assert.match(reference, /^[0-9a-f]{32}$/);
  assert.equal(init.headers['X-Request-ID'], reference);
  assert.equal(body.reference, reference);
  assert.equal(body.kind, 'error');
  assert.equal(body.route, '/report/***');
  assert.ok(body.message.length <= 300);
  assert.ok(!body.message.includes('?') && !body.message.includes('SECRET'));
  assert.equal(typeof body.appVersion, 'string');
  assert.equal('status' in body, false);
  // The UI log's tab id and page name (Phase 1.34 S2.5), never the raw path.
  assert.match(body.session, /^[0-9a-f]{32}$/);
  assert.equal(body.page, 'report');
});

test('api.js reports network failures and server errors with the request reference, and nothing else', async () => {
  const before = calls.length;
  const broken = await failure('/broken?page=2');
  await failure('/net');
  await failure('/missing');
  const controller = new AbortController();
  controller.abort();
  await failure('/ok', { signal: controller.signal });
  const reports = calls.slice(before).map(({ body }) => body);
  assert.deepEqual(
    reports.map(({ kind, status, message }) => [kind, status, message]),
    [
      ['api', 500, 'GET /broken: Request failed'],
      ['api', undefined, 'GET /net: Network Error'],
    ]
  );
  assert.equal(reports[0].reference, broken.reference);
});

test('the same error is sent once, and a repeat returns the first reference', () => {
  const before = calls.length;
  const first = reportClientError({ kind: 'error', message: 'RangeError: repeated' });
  assert.equal(reportClientError({ kind: 'render', message: 'RangeError: repeated' }), first);
  assert.equal(calls.length, before + 1);
});

test('a refused report is sent once more without keepalive, then dropped without another report', async () => {
  const before = calls.length;
  refuse = true;
  const reference = reportClientError({ kind: 'error', message: 'Error: unsent' });
  await tick();
  refuse = false;
  const tries = calls.slice(before);
  assert.deepEqual(
    tries.map(({ init }) => init.keepalive),
    [true, false]
  );
  assert.ok(tries.every(({ body }) => body.reference === reference && body.message === 'Error: unsent'));
});

test('uncaught errors and rejections are reported; API errors and bare script errors are not', () => {
  const before = calls.length;
  const fire = (type, fields) => window.dispatchEvent(Object.assign(new Event(type), fields));
  fire('error', { error: new TypeError('x is undefined'), message: 'Uncaught TypeError: x is undefined' });
  fire('error', { error: null, message: 'Script error.' });
  fire('unhandledrejection', { reason: new Error('lost promise') });
  fire('unhandledrejection', { reason: apiError(new axios.AxiosError('Network Error', 'ERR_NETWORK'), 'Failed.') });
  fire('unhandledrejection', { reason: new axios.AxiosError('Network Error', 'ERR_NETWORK') });
  fire('unhandledrejection', { reason: 'plain text' });
  assert.deepEqual(
    calls.slice(before).map(({ body }) => [body.kind, body.message]),
    [
      ['error', 'TypeError: x is undefined'],
      ['rejection', 'Error: lost promise'],
      ['rejection', 'plain text'],
    ]
  );
});

test('nothing is reported while the page is being left', () => {
  const before = calls.length;
  window.dispatchEvent(new Event('pagehide'));
  assert.equal(reportClientError({ kind: 'api', message: 'GET /x: Request aborted' }), null);
  window.dispatchEvent(new Event('pageshow'));
  assert.equal(calls.length, before);
});

test('a page load sends at most 10 reports', () => {
  const reports = () => calls.filter(({ init }) => init.keepalive).length; // a retry isn't a new report
  for (let i = 0; i < 20; i++) reportClientError({ kind: 'error', message: `Error: number ${i}` });
  assert.equal(reports(), 10);
  assert.equal(reportClientError({ kind: 'error', message: 'Error: one too many' }), null);
  assert.equal(reports(), 10);
});
