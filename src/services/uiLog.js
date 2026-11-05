// The UI log's collector (Phase 1.34): queues the browser's page events and sends them in batches to
// POST /api/client-events by sendBeacon, so the logs show what made a page slow without slowing or breaking it.
// Area: platform

import { startPageElements } from './pageElements.js';
import { safely, startPageViews } from './pageViews.js';
import { startInteractions } from './uiNames.js';
import { startWebVitals } from './webVitals.js';

const FLUSH_AT = 20; // queued events: a full queue goes at once
const FLUSH_MS = 10000; // and anything queued goes within 10 s
const BATCH_EVENTS = 50; // the server's limit per batch
const BATCH_BYTES = 59000; // one batch's events, so the body stays under 60 KB (the server refuses over 64 KB)
const TEXT_MAX = 300; // the server cuts longer strings
const SESSION_KEY = 'mst.session';

let endpoint = null; // set by installUiLog when this tab logs; null means logging is off
let session = null;
let queue = [];
let timer = null;
let encoder = null;

const randomHex = (bytes) =>
  Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (byte) => byte.toString(16).padStart(2, '0')).join('');

// This tab's id (session.id): 32 lowercase hex characters, kept in sessionStorage so a reload keeps it.
export function uiSessionId() {
  if (session) return session;
  try {
    const kept = sessionStorage.getItem(SESSION_KEY);
    session = /^[0-9a-f]{32}$/.test(kept ?? '') ? kept : randomHex(16);
    sessionStorage.setItem(SESSION_KEY, session);
  } catch {
    session ??= randomHex(16); // storage can be blocked: the id then lasts as long as the page
  }
  return session;
}

// Whether this tab logs: not when switched off (D-7), and only in the sampled share of tabs (VITE_UI_LOG_RATE,
// 0 to 1, 1 when unset). The tab's id picks its share, so a reload keeps the choice.
function tabLogs(rateSetting) {
  try {
    if (localStorage.getItem('mst.uiLog') === 'off') return false;
  } catch {
    /* no storage, so no off switch */
  }
  const rate = rateSetting === undefined || rateSetting === '' ? 1 : Number(rateSetting);
  return parseInt(uiSessionId().slice(0, 8), 16) / 2 ** 32 < rate;
}

// Queues one event: its name and its flat fields. Only strings (cut to 300), finite numbers and booleans are kept.
export function logEvent(name, fields) {
  if (!endpoint) return;
  try {
    const event = { name };
    for (const [key, value] of Object.entries(fields)) {
      if (typeof value === 'string') event[key] = value.slice(0, TEXT_MAX);
      else if (typeof value === 'boolean' || Number.isFinite(value)) event[key] = value;
    }
    queue.push(event);
    if (queue.length >= FLUSH_AT) flush();
    else timer ??= setTimeout(flush, FLUSH_MS);
  } catch {
    /* logging never breaks the page */
  }
}

// Sends everything queued, in batches within the server's limits. Nothing is ever retried.
function flush() {
  clearTimeout(timer);
  timer = null;
  const events = queue;
  queue = [];
  try {
    encoder ??= new TextEncoder();
    let batch = [];
    let bytes = 0;
    for (const event of events) {
      const size = encoder.encode(JSON.stringify(event)).length + 1;
      if (batch.length === BATCH_EVENTS || (batch.length > 0 && bytes + size > BATCH_BYTES)) {
        send(batch);
        batch = [];
        bytes = 0;
      }
      batch.push(event);
      bytes += size;
    }
    if (batch.length > 0) send(batch);
  } catch {
    /* logging never breaks the page */
  }
}

// sendBeacon posts a string as text/plain, so the API's other origin needs no CORS preflight, and it outlives
// the page. Without it, or when the browser refuses (its queue is full), fetch with keepalive tries once.
function send(events) {
  const body = JSON.stringify({ session: uiSessionId(), events });
  try {
    if (navigator.sendBeacon?.(endpoint, body)) return;
  } catch {
    /* fall back to fetch */
  }
  fetch(endpoint, {
    method: 'POST',
    body,
    keepalive: true,
    credentials: 'omit',
    headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
  }).catch(() => {});
}

// Turns the UI log on, once, from the browser entry point, unless this tab is switched off or sampled out.
export function installUiLog(apiBaseUrl, rateSetting) {
  try {
    if (endpoint || !tabLogs(rateSetting)) return;
    const base = String(apiBaseUrl).replace(/\/+$/, ''); // axios allows a final '/', so allow it here too
    endpoint = `${base}/api/client-events`;
    // Each part starts on its own, so a browser without one still logs the rest. The page views go first: their
    // pagehide listener must queue its lines before the flush below.
    safely(startPageViews)(logEvent);
    safely(startWebVitals)();
    safely(startPageElements)();
    safely(startInteractions)();
    // A hidden tab may never come back. This listener is on window, so it runs after the page views' and
    // web-vitals' own visibilitychange listeners and sends what they just queued.
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
    window.addEventListener('pagehide', flush);
  } catch {
    /* logging never breaks the page */
  }
}
