// Sends browser errors to our logs (POST /api/client-errors): uncaught errors, unhandled rejections, crashes and
// failed API calls, each with its reference. At most 10 a page load, no repeats, never page text or query strings.
// Area: platform

import { pageFor } from './pages.js';
import { uiSessionId } from './uiLog.js';

const LIMIT = 10;
// The bundle's file name changes with every build (Vite adds a content hash), so it names the build.
const APP_VERSION = new URL(import.meta.url).pathname.split('/').pop();
const sent = new Map(); // what was reported → the reference it was sent with
let endpoint = null; // set by installClientErrorReporting, so nothing is sent before the app starts
let leaving = false; // requests the browser aborts while leaving the page aren't failures

// A new reference: 32 lowercase hex characters, the shape the backend keeps as the request's trace id.
export function newRequestId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// How a teacher sees a reference: its first 8 characters, as 3F9C-2A1B. Only an id that starts with 8 hex
// characters can be found in the logs, so anything else shows nothing rather than a made-up code.
export function formatReference(id) {
  const head = /^[0-9a-f]{8}/i.exec(id ?? '')?.[0];
  return head ? `${head.slice(0, 4)}-${head.slice(4)}`.toUpperCase() : null;
}

// "TypeError: x is undefined" for an Error, and the text of anything else.
export function describeError(error) {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

// Query strings and the public report's share token never leave the browser (the backend masks the same token).
function clean(text) {
  return String(text ?? '')
    .replace(/(\/[^\s?"']*)\?[^\s"']*/g, '$1')
    .replace(/(\/report\/)[^/?\s"']+/g, '$1***')
    .slice(0, 300);
}

// Sends one report and returns its reference. A repeat isn't sent again and returns the first report's reference.
// Returns null when nothing was sent: before the app starts, while the page is being left, or after 10 reports.
export function reportClientError({ kind, message, status, reference = newRequestId() }) {
  try {
    const text = clean(message);
    const key = `${status ?? ''} ${text}`;
    if (sent.has(key)) return sent.get(key);
    if (!endpoint || leaving || sent.size >= LIMIT) return null;
    const body = { kind, message: text, route: clean(window.location.pathname), status, reference };
    // The tab and the page, as the UI log names them (SOT-6), so a report joins that tab's page events.
    Object.assign(body, { session: uiSessionId(), page: pageFor(window.location.pathname).name.slice(0, 64) });
    const send = (keepalive) =>
      fetch(endpoint, {
        method: 'POST',
        keepalive,
        credentials: 'omit',
        headers: { 'Content-Type': 'application/json', 'X-Request-ID': reference },
        body: JSON.stringify({ ...body, appVersion: APP_VERSION }),
      });
    // keepalive lets a report finish while the page unloads. Some browsers refuse it when the API is on another
    // origin (a CORS preflight), so a refused report is sent once more without it, then dropped, never reported.
    send(true)
      .catch(() => send(false))
      .catch(() => {});
    sent.set(key, reference);
    return reference;
  } catch {
    return null;
  }
}

// An API error (axios's, or a service's that keeps the reference) is api.js's to report.
const isApiError = (reason) =>
  typeof reason === 'object' && reason !== null && ('reference' in reason || Boolean(reason.isAxiosError));

// Turns reporting on, once, from the browser entry point, and reports uncaught errors and unhandled rejections.
export function installClientErrorReporting(apiBaseUrl) {
  if (endpoint) return;
  const base = String(apiBaseUrl).replace(/\/+$/, ''); // axios allows a final '/', so allow it here too
  endpoint = `${base}/api/client-errors`;
  window.addEventListener('error', (event) => {
    // Without an error object it's a cross-origin "Script error." or a browser notice, with nothing to act on.
    if (event.error) reportClientError({ kind: 'error', message: describeError(event.error) });
  });
  window.addEventListener('unhandledrejection', (event) => {
    if (!isApiError(event.reason)) reportClientError({ kind: 'rejection', message: describeError(event.reason) });
  });
  window.addEventListener('pagehide', () => (leaving = true));
  window.addEventListener('pageshow', () => (leaving = false)); // back from the browser's page cache
}
