// Page views for the UI log: one per pathname, with its page name, its ready time (D-5) and its time on page.
// Ready is when the last API call, page chunk or file ended, plus one frame, once nothing has loaded for 500 ms.
// Area: platform

import { lazy, useLayoutEffect, useMemo } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { pageFor } from './pages.js';

const QUIET_MS = 500; // D-5: this long with nothing loading means the page has settled
const FRAME_MS = 100; // QA-2: a hidden tab paints no frames, so the frame is raced against this timer
const CAP_MS = 30000; // a view still loading after 30 s is sent as timed out
// The bundle's file name changes with every build (Vite adds a content hash), so it names the build.
const APP_VERSION = new URL(import.meta.url).pathname.split('/').pop();

let log = null; // the collector's logEvent, set by startPageViews when this tab logs
let view = null; // the page view open now
const inflight = new Set(); // the API calls and page chunks still loading, each as { start, view, prefetchFor }

const randomId = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(8)), (byte) => byte.toString(16).padStart(2, '0')).join('');

// Logging never breaks the page: a handler that fails does nothing.
export const safely =
  (fn) =>
  (...args) => {
    try {
      return fn(...args);
    } catch {
      return undefined;
    }
  };

// Queues an event for a view (the open one by default), with the three fields every line carries.
export function logForView(name, fields, current = view) {
  if (!log || !current) return;
  log(name, {
    'mst.page.view_id': current.id,
    'app.screen.name': current.name,
    'url.template': current.route,
    ...fields,
  });
}

// The open view, if `time` falls in it. pageElements.js logs and totals each element against it.
export const viewAt = (time) => (view && time >= view.start && time < (view.end ?? Infinity) ? view : null);

// Counts an API call or a page chunk as page activity. The returned function ends it and returns the view it
// belongs to: the view that adopted it (a prefetch for that view's page, QA-15), else the open view if it
// started with it or after, else the view that was open when it started.
export function startActivity(prefetchFor) {
  if (!log) return () => null;
  const item = { start: performance.now(), view, prefetchFor };
  inflight.add(item);
  // A view waits only for what started with it or after, so a call the last page left running doesn't count.
  return safely(() => {
    if (!inflight.delete(item)) return null;
    const owner = item.adoptedBy ?? (view && item.start >= view.start ? view : null);
    if (!owner) return item.view;
    settle(owner);
    return owner;
  });
}

// React's lazy() for a page: its chunk's download counts as page activity.
export function lazyPage(load) {
  return lazy(() => {
    const end = startActivity();
    return load().finally(end);
  });
}

// Whether something the view waits for is still loading: a prefetch it adopted, or anything else that started
// with the view or after, and before it ended.
function busy(current) {
  for (const item of inflight) {
    if (item.adoptedBy === current) return true;
    if (!item.adoptedBy && item.start >= current.start && item.start < (current.end ?? Infinity)) return true;
  }
  return false;
}

function openView(path, nav, start) {
  const hidden = document.visibilityState === 'hidden';
  // What the view loaded before it was ready, for its page_view (pageElements.js adds to them).
  const totals = { apiCount: 0, apiMs: 0, files: 0, filesCached: 0, bytes: 0, cached: 0, fetched: 0, framesMs: 0 };
  const visibleSince = hidden ? null : start;
  return { id: randomId(), path, ...pageFor(path), nav, start, hidden, visibleSince, totals, frames: 0 };
}

// Starts timing a view once its page has rendered, with the 30 s cap.
function arm(current) {
  if (current.armed) return;
  current.armed = true;
  const remaining = current.start + CAP_MS - performance.now();
  current.capTimer = setTimeout(
    safely(() => sendPageView(current, { readyAt: current.start + CAP_MS, timedOut: true })),
    Math.max(0, remaining)
  );
  settle(current);
}

// With nothing loading since `endedAt`, the view is ready at the next frame, unless something starts within
// QUIET_MS. Readiness counts from the end of the last activity, so the quiet window doesn't add to it.
function settle(current, endedAt = performance.now()) {
  if (!current.armed || current.done || busy(current)) return;
  Object.assign(current, { idleAt: endedAt, frameAt: null });
  const frame = safely(() => {
    if (current.idleAt === endedAt) current.frameAt ??= performance.now();
  });
  requestAnimationFrame(frame);
  setTimeout(frame, FRAME_MS);
  const quiet = safely(() => {
    // A later activity has ended (settling again) or is still running: this window doesn't count.
    if (current.idleAt === endedAt && !busy(current)) sendPageView(current, { readyAt: current.frameAt ?? endedAt });
  });
  setTimeout(quiet, Math.max(0, endedAt + QUIET_MS - performance.now()));
}

// QA-4: a file that ends inside the quiet window counts as activity that ended then, so the ready time follows
// the page's last file too, as QA's m.js measures it.
export function fileEnded(current, end) {
  if (current.idleAt !== undefined && end > current.idleAt) settle(current, end);
}

// The view's browser.page_view, once: ready, timed out at 30 s, or left before it was ready (with no ready time),
// with the totals of what it loaded until then.
function sendPageView(current, { readyAt, timedOut = false, left = false }) {
  if (current.done) return;
  current.done = true;
  current.readyAt = left ? current.end : readyAt; // files started later aren't the view's (pageElements.js)
  clearTimeout(current.capTimer);
  const { totals } = current;
  logForView(
    'browser.page_view',
    {
      'mst.page.nav': current.nav,
      'mst.page.ready_ms': left ? undefined : Math.round(Math.min(readyAt - current.start, CAP_MS)),
      'mst.page.ready_timeout': timedOut,
      'mst.page.left_before_ready': left,
      'mst.page.hidden': current.hidden,
      'mst.page.api_count': totals.apiCount,
      'mst.page.api_ms': Math.round(totals.apiMs),
      'mst.page.files': totals.files,
      'mst.page.files_cached': totals.filesCached,
      'mst.page.download_kb': Math.round(totals.bytes / 102.4) / 10,
      'mst.query.cached': totals.cached,
      'mst.query.fetched': totals.fetched,
      'mst.page.long_frames_ms': Math.round(totals.framesMs),
      'mst.app.version': APP_VERSION,
    },
    current
  );
}

// The time the view was shown since it opened or came back into view, as one browser.page_end.
function endVisit(current, at) {
  if (current.visibleSince === null) return;
  logForView(
    'browser.page_end',
    { 'mst.page.duration_ms': Math.round(Math.max(0, at - current.visibleSince)) },
    current
  );
  current.visibleSince = null;
}

// Ends a view at `at`: its page_view if not sent yet, then its page_end. A view with nothing loading had loaded,
// even if its quiet window hadn't run out.
function finish(current, at) {
  current.end = at;
  const idle = current.idleAt !== undefined && current.idleAt <= at && !busy(current);
  sendPageView(current, idle ? { readyAt: current.frameAt ?? current.idleAt } : { left: true });
  endVisit(current, at);
}

// A route change from usePageViews. The first render arms the view opened at start. A redirect (a replace)
// before the view is ready keeps timing it under the new page. Any other new pathname ends it and opens the next.
export const routeChanged = safely(({ pathname, navigation, at }) => {
  if (!log) return;
  if (pathname === view.path) {
    arm(view);
  } else if (navigation === 'REPLACE' && !view.done) {
    Object.assign(view, { path: pathname }, pageFor(pathname));
  } else {
    const next = openView(pathname, navigation === 'POP' ? 'back_forward' : 'route', at);
    // QA-15: the sidebar prefetches a page's data on hover, a moment before the click. A prefetch for this page
    // that's still loading is the new view's own: it waits for it, and the call is logged under it.
    for (const item of inflight) if (item.prefetchFor === pathname) item.adoptedBy ??= next;
    finish(view, at);
    view = next;
    arm(view);
  }
});

// Called once, in ThemedApp: logs each page view.
export function usePageViews() {
  const { pathname } = useLocation();
  const navigation = useNavigationType();
  // Timed in the render, so the new page's chunk, which starts loading later in the same render, counts.
  const change = useMemo(() => ({ pathname, navigation, at: performance.now() }), [pathname, navigation]);
  // A layout effect runs before the page's own effects, so the new view is open when its queries and calls start.
  useLayoutEffect(() => {
    routeChanged(change);
  }, [change]);
}

// Opens the first load's view, timed from the navigation, and follows the tab's visibility. Called by installUiLog.
export function startPageViews(send) {
  log = send;
  view = openView(window.location.pathname, 'load', 0);
  // QA-2: a first load hidden at any point before the app started is timed in the background too.
  if (performance.getEntriesByType?.('visibility-state')?.some((entry) => entry.name === 'hidden')) view.hidden = true;
  document.addEventListener(
    'visibilitychange',
    safely(() => {
      const now = performance.now();
      if (document.visibilityState === 'hidden') {
        if (!view.done) view.hidden = true; // QA-2: the report leaves views timed in the background out
        endVisit(view, now);
      } else {
        view.visibleSince ??= now;
      }
    })
  );
  window.addEventListener(
    'pagehide',
    safely(() => finish(view, performance.now()))
  );
}
