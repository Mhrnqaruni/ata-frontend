// Clicks and submits for the UI log (SOT-6, D-8 QA-1): a browser.interaction for each, and a browser.slow_interaction
// for any taking 200 ms or more, naming the element by its data-mst, link, field name or role, never by its text.
// Area: platform

import { pageFor } from './pages.js';
import { logForView, safely } from './pageViews.js';

const TARGET_TAGS = new Set(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']);
const TARGET_ROLES = new Set(
  'button tab menuitem menuitemradio menuitemcheckbox link checkbox radio switch option combobox'.split(' ')
);
const FIELDS = new Set(['input', 'select', 'textarea']);
const LANDMARK_TAGS = new Map([
  ['NAV', 'nav'],
  ['HEADER', 'header'],
  ['MAIN', 'main'],
  ['DIALOG', 'dialog'],
]);
const LANDMARK_ROLES = new Map([
  ['navigation', 'nav'],
  ['banner', 'header'],
  ['main', 'main'],
  ['dialog', 'dialog'],
  ['alertdialog', 'dialog'],
]);
// Only letters, - and _: generated ids (React's :r3:, MUI's mui-12) and ids made from records are left out.
const STABLE_ID = /^[a-z][a-z_-]*$/i;
const slowSeen = new Set(); // interaction ids already logged as slow

const isTarget = (node) =>
  node.hasAttribute('data-mst') ||
  TARGET_TAGS.has(node.tagName) ||
  (node.tagName === 'A' && node.hasAttribute('href')) ||
  TARGET_ROLES.has(node.getAttribute('role'));

// What a click is on (SOT-6): the nearest element with a data-mst, a button, link, field or interactive role.
function targetOf(node) {
  for (; node?.getAttribute; node = node.parentElement) if (isTarget(node)) return node;
  return null;
}

// A link's target page, or 'external' for another site: never the raw path.
function linkName(element) {
  try {
    const url = new URL(element.getAttribute('href'), window.location.href);
    return `link:${url.origin === window.location.origin ? pageFor(url.pathname).name : 'external'}`;
  } catch {
    return 'link';
  }
}

// An element's own name (D-8 QA-1): its data-mst; a link's target page; a field's name attribute; else role#id
// for a stable id; else its role or tag. Never its text, aria-label, title or value.
function ownName(element) {
  const tag = element.tagName.toLowerCase();
  const role = element.getAttribute('role');
  const name = element.getAttribute('name');
  if (element.getAttribute('data-mst')) return element.getAttribute('data-mst');
  if (element.hasAttribute('href') && (tag === 'a' || role === 'link')) return linkName(element);
  if (FIELDS.has(tag) && name) return `${tag}:${name.slice(0, 40)}`;
  return STABLE_ID.test(element.id) ? `${role || tag}#${element.id}` : role || tag;
}

// The nearest named ancestor: a data-mst, or a nav, header, main or dialog landmark (by tag or role).
function ancestorName(element) {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const name =
      node.getAttribute('data-mst') || LANDMARK_ROLES.get(node.getAttribute('role')) || LANDMARK_TAGS.get(node.tagName);
    if (name) return name;
  }
  return null;
}

// The element's app.widget.id: its nearest named ancestor, then its own name, as sidebar/link:classes.
export function widgetName(element) {
  const ancestor = ancestorName(element);
  return ancestor ? `${ancestor}/${ownName(element)}` : ownName(element);
}

// One browser.interaction per click on something interactive, and per form submitted.
const onAction = safely((event) => {
  const element = event.type === 'submit' ? event.target : targetOf(event.target);
  if (element?.getAttribute) {
    logForView('browser.interaction', { 'app.widget.id': widgetName(element), 'mst.ui.action': event.type });
  }
});

// Event Timing: one browser.slow_interaction per interaction of 200 ms or more, from its longest event.
function onSlowEvents(list) {
  const longest = new Map();
  for (const entry of list.getEntries()) {
    if (!entry.interactionId || slowSeen.has(entry.interactionId)) continue;
    if (entry.duration > (longest.get(entry.interactionId)?.duration ?? -1)) longest.set(entry.interactionId, entry);
  }
  for (const [id, entry] of longest) {
    slowSeen.add(id);
    const element = targetOf(entry.target);
    logForView('browser.slow_interaction', {
      'app.widget.id': element ? widgetName(element) : undefined,
      'mst.ui.action': entry.name,
      duration_ms: Math.round(entry.duration),
      'mst.ui.input_delay_ms': Math.round(entry.processingStart - entry.startTime),
      'mst.ui.processing_ms': Math.round(entry.processingEnd - entry.processingStart),
      'mst.ui.presentation_ms': Math.round(entry.startTime + entry.duration - entry.processingEnd),
    });
  }
}

// Called by installUiLog: one capture listener for clicks and submits, which runs before the page's own handlers
// and only reads attributes, and the Event Timing observer.
export function startInteractions() {
  document.addEventListener('click', onAction, true);
  document.addEventListener('submit', onAction, true);
  if (PerformanceObserver.supportedEntryTypes?.includes('event')) {
    new PerformanceObserver(safely(onSlowEvents)).observe({ type: 'event', durationThreshold: 200, buffered: true });
  }
}
