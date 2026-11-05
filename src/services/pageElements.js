// The UI log's page elements (SOT-4, SOT-7, D-4): each API call, each file a page started before it was ready and
// each long frame, logged against its page view with when it started, how long it took and what the cache did.
// Area: platform

import { queryClient } from './queryCache.js';
import { fileEnded, logForView, safely, startActivity, viewAt } from './pageViews.js';

const NOT_FILES = new Set(['xmlhttprequest', 'fetch', 'beacon']); // API calls and our own event beacons
const FRAMES_PER_VIEW = 20;
const ms = (value) => Math.round(value * 10) / 10;

// A file's address without its query: its path here, or its host and path on another origin.
export function fileAddress(url) {
  try {
    const { protocol, host, pathname } = new URL(url, window.location.href);
    if (!protocol.startsWith('http')) return protocol; // data: and blob: addresses are the file itself
    const path = pathname.replace(/(\/report\/)[^/]+/, '$1***'); // the public report's share token
    return host === window.location.host ? path : host + path;
  } catch {
    return undefined;
  }
}

// An API call's path (QA-7): no query, the public report's token masked, and each segment with a digit or over 20
// characters (an id, a code or a token) as :id. The report joins the server's own route by trace_id.
export function apiPath(url) {
  const { pathname } = new URL(url ?? '', 'http://api.invalid');
  return pathname
    .replace(/(\/report\/)[^/]+/, '$1***')
    .split('/')
    .map((part) => (/\d/.test(part) || part.length > 20 ? ':id' : part))
    .join('/');
}

// Server-Timing as the API sends it: app;dur=12.3, db;dur=4.5;desc="3", dbwait;dur=0.4
// → { app: { dur: '12.3' }, db: { dur: '4.5', desc: '3' }, dbwait: { dur: '0.4' } }
function serverTiming(header) {
  const metrics = {};
  for (const metric of String(header ?? '').split(',')) {
    const [name, ...params] = metric.split(';').map((part) => part.trim());
    const pairs = params.map((param) => param.split('=').map((part) => part.trim().replace(/^"|"$/g, '')));
    if (name) metrics[name] = Object.fromEntries(pairs);
  }
  return metrics;
}

// api.js's request interceptor: the call counts as page activity from now (SOT-3), and is timed. A hover
// prefetch names the page it's for, whose view takes the call when it opens (QA-15).
export function startApiCall(prefetchFor) {
  return { start: performance.now(), end: startActivity(prefetchFor) };
}

// api.js's response interceptors: one browser.api_call, against the view the call was made for, with the server's
// own split of its time (D-3). `error` is axios's, for a failed call.
export function finishApiCall(config, response, error) {
  try {
    const call = config?.mstCall;
    const owner = call?.end();
    if (!owner) return;
    const duration = performance.now() - call.start;
    const headers = response?.headers ?? {};
    const timing = serverTiming(headers['server-timing']);
    const server = parseFloat(timing.app?.dur);
    if (!owner.done) {
      owner.totals.apiCount += 1;
      owner.totals.apiMs += duration;
    }
    logForView(
      'browser.api_call',
      {
        trace_id: config.mstRequestId,
        'http.request.method': String(config.method ?? 'get').toUpperCase(),
        'url.path': apiPath(config.url),
        'http.response.status_code': response?.status,
        'error.type': error ? (response ? String(response.status) : error.code || 'error') : undefined,
        duration_ms: ms(duration),
        'http.response.body.size': parseInt(headers['content-length'], 10),
        'mst.server_ms': server,
        'mst.db_ms': parseFloat(timing.db?.dur),
        'mst.db_queries': parseInt(timing.db?.desc, 10),
        'mst.db_wait_ms': parseFloat(timing.dbwait?.dur),
        'mst.network_ms': ms(Math.max(0, duration - server)), // NaN, so left out, without Server-Timing
        'mst.start_ms': ms(call.start - owner.start),
      },
      owner
    );
  } catch {
    /* logging never breaks the page */
  }
}

// SOT-7, W4: from the cache (nothing transferred), revalidated, downloaded, or unknown when another origin hides
// its timing (no Timing-Allow-Origin). A 304 moves only headers, and browsers report it three ways: deliveryType
// 'cache' (Resource Timing gives validated responses that too), fewer bytes than the body, or, on Chromium's reload
// of the same URL, no body at all with no deliveryType. Only an empty file could look like the last.
export function cacheOf(entry) {
  if (entry.transferSize === 0 && entry.encodedBodySize === 0 && entry.responseStart === 0) return 'unknown';
  if (entry.transferSize === 0) return 'cache';
  const headersOnly = entry.transferSize < entry.encodedBodySize || entry.encodedBodySize === 0;
  return entry.deliveryType === 'cache' || headersOnly ? 'revalidated' : 'network';
}

// One browser.resource per file its view started before it was ready. The view's totals count the files it had
// by then, and one ending inside the quiet window moves the ready time (QA-4).
function onFiles(list) {
  for (const entry of list.getEntries()) {
    if (NOT_FILES.has(entry.initiatorType)) continue;
    const owner = viewAt(entry.startTime);
    if (!owner || (owner.done && entry.startTime > owner.readyAt)) continue;
    const cache = cacheOf(entry);
    if (!owner.done) {
      owner.totals.files += 1;
      if (cache === 'cache' || cache === 'revalidated') owner.totals.filesCached += 1;
      owner.totals.bytes += entry.transferSize;
      fileEnded(owner, entry.responseEnd);
    }
    const blocking = entry.renderBlockingStatus; // Chromium only
    logForView(
      'browser.resource',
      {
        'mst.resource.name': fileAddress(entry.name),
        'mst.resource.type': entry.initiatorType,
        duration_ms: ms(entry.duration),
        'mst.resource.transfer_bytes': entry.transferSize,
        'mst.resource.body_bytes': entry.encodedBodySize,
        'mst.cache': cache,
        'mst.resource.blocking': blocking === undefined ? undefined : blocking === 'blocking',
        'mst.start_ms': ms(entry.startTime - owner.start),
        'mst.resource.queue_ms': entry.requestStart > 0 ? ms(entry.requestStart - entry.startTime) : undefined,
      },
      owner
    );
  }
}

// A long frame's longest script, by file and function, and what started it, with element ids and queries
// taken out (DIV#x.onclick → DIV.onclick).
function frameScript(entry) {
  const script = [...(entry.scripts ?? [])].sort((a, b) => b.duration - a.duration)[0];
  if (!script) return {};
  const file = script.sourceURL ? fileAddress(script.sourceURL) : '';
  const invoker = String(script.invoker ?? '');
  return {
    'mst.frame.script': [file, script.sourceFunctionName].filter(Boolean).join(':') || undefined,
    'mst.frame.invoker': /^\w+:\/\//.test(invoker)
      ? fileAddress(invoker)
      : invoker.replace(/#[^.[]*/g, '').replace(/\[[^\]]*\]/g, '') || undefined,
  };
}

// browser.long_frame, at most 20 a view. A frame belongs to the view open when it ended, so a route change's own
// render counts for the new page. The view's total takes the frames before it was ready.
function onFrames(list) {
  for (const entry of list.getEntries()) {
    const owner = viewAt(entry.startTime + entry.duration);
    if (!owner) continue;
    if (!owner.done) owner.totals.framesMs += entry.duration;
    if (owner.frames >= FRAMES_PER_VIEW) continue;
    owner.frames += 1;
    logForView(
      'browser.long_frame',
      {
        duration_ms: ms(entry.duration),
        'mst.frame.blocking_ms': ms(entry.blockingDuration),
        ...frameScript(entry),
        'mst.start_ms': ms(entry.startTime - owner.start),
      },
      owner
    );
  }
}

// SOT-7: per view until it's ready, the queries shown from React Query's cache (an observer added while there's
// data) and the queries fetched.
function onQuery(event) {
  const owner = viewAt(performance.now());
  if (!owner || owner.done) return;
  if (event.type === 'observerAdded' && event.query.state.data !== undefined) owner.totals.cached += 1;
  else if (event.type === 'updated' && event.action?.type === 'fetch') owner.totals.fetched += 1;
}

// Called by installUiLog. The observers read the buffered entries, so the first load's files and frames count.
export function startPageElements() {
  queryClient.getQueryCache().subscribe(safely(onQuery));
  performance.setResourceTimingBufferSize?.(500); // W4: 250 by default
  new PerformanceObserver(safely(onFiles)).observe({ type: 'resource', buffered: true });
  if (PerformanceObserver.supportedEntryTypes?.includes('long-animation-frame')) {
    new PerformanceObserver(safely(onFrames)).observe({ type: 'long-animation-frame', buffered: true });
  }
}
