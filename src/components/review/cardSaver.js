// One review card's autosave (Phase 1.47 SOT-6, QA N-1; design.md §3.9): a real change with a valid mark saves after
// 1.5 s of quiet or when the teacher leaves the card's fields, one save at a time, so a card never trips itself.
// Area: platform

export const QUIET_MS = 1500;

const text = (value) => String(value ?? '').trim();

// A typed mark as a number, or null when it isn't one. An empty box is never 0 (N-1).
export function markNumber(typed) {
  const value = text(typed);
  return /^\d+(?:\.\d+)?$/.test(value) ? Number(value) : null;
}

// Whether a typed mark may be saved: a number from 0 to the maximum, and a whole one where marks are whole.
export function validMark(typed, max, { whole = false } = {}) {
  const value = markNumber(typed);
  return value !== null && value <= Number(max) && (!whole || Number.isInteger(value));
}

// One field: the mark by its number when both are numbers ("07" is 7), anything else as text without outer spaces.
function sameField(key, a, b) {
  if (key === 'mark' && markNumber(a) !== null && markNumber(b) !== null) return markNumber(a) === markNumber(b);
  return text(a) === text(b);
}

// A card's values, { mark, comment }, are the same when every field is.
export const sameValues = (a = {}, b = {}) =>
  Object.keys({ ...a, ...b }).every((key) => sameField(key, a[key], b[key]));

/**
 * createCardSaver({ record, valuesOf, isValid, save, onUpdate, onSaved, quietMs, timers, now })
 * - record: the server's record for the card, which carries its revision; valuesOf(record) gives { mark, comment }.
 * - isValid(values, record): whether the mark may be saved (validMark). Nothing else is ever sent (N-1).
 * - save(values, record, { undo }) resolves with the server's new record. `undo` is the record from before the change
 *   being undone. A refusal with status 409 means someone changed it first.
 * - onUpdate() after anything the card shows changes; onSaved({ before, after, undo }) after a save lands.
 * Statuses: idle · waiting (for quiet) · invalid · saving · saved · failed · conflict.
 */
export function createCardSaver({
  record,
  valuesOf,
  isValid,
  save,
  onUpdate = () => {},
  onSaved = () => {},
  quietMs = QUIET_MS,
  timers = globalThis,
  now = () => Date.now(),
}) {
  let current = record; // the server's record as last seen
  let saved = valuesOf(record); // what the server keeps
  let draft = saved; // what the card shows
  let sending = null; // the values of the save in flight
  let outcome = null; // the last save's: 'saved', 'failed' or 'conflict'
  let error = null;
  let timer = null;
  let again = false; // a change waits for the save in flight
  let undoNext = null; // an Undo waits for the save in flight
  let savedAt = 0;

  const pending = () => !sameValues(draft, sending ?? saved);
  const ready = () => pending() && isValid(draft, current);
  const stop = () => {
    if (timer !== null) timers.clearTimeout(timer);
    timer = null;
  };

  function status() {
    if (outcome === 'conflict') return 'conflict';
    if (sending) return 'saving';
    if (!pending()) return outcome === 'saved' ? 'saved' : 'idle';
    if (!isValid(draft, current)) return 'invalid';
    return outcome === 'failed' ? 'failed' : 'waiting';
  }

  async function run(undo) {
    const values = undo ? valuesOf(undo) : draft;
    const before = current;
    sending = values;
    outcome = null;
    error = null;
    onUpdate();
    let landed = null;
    try {
      const after = await save(values, current, { undo });
      current = after;
      saved = valuesOf(after);
      savedAt = now();
      if (undo || sameValues(draft, values)) draft = saved; // the card shows what the server keeps
      outcome = 'saved';
      landed = { before, after, undo: Boolean(undo) };
    } catch (failure) {
      outcome = failure?.status === 409 ? 'conflict' : 'failed';
      error = failure;
    }
    sending = null;
    if (landed) onSaved(landed);
    const waitingUndo = outcome === 'saved' ? undoNext : null;
    const next = outcome === 'saved' && again && ready();
    again = false;
    undoNext = null;
    if (waitingUndo) return run(waitingUndo);
    if (next) return run(null);
    onUpdate();
    return undefined;
  }

  function flush() {
    stop();
    if (outcome === 'conflict' || !ready()) return;
    if (sending) again = true;
    else void run(null);
  }

  return {
    // The teacher typed: save after a quiet moment, if the change is real and its mark is valid.
    edit(values) {
      draft = { ...draft, ...values };
      stop();
      if (outcome === 'failed') {
        outcome = null;
        error = null;
      }
      if (outcome !== 'conflict' && ready()) timer = timers.setTimeout(flush, quietMs);
      onUpdate();
    },
    // The teacher left the card's fields: a change waiting for quiet saves now. No change, no save.
    leave() {
      if (timer !== null) flush();
    },
    retry() {
      if (!sending) flush();
    },
    // Undo the change made from `before` (the toast's): its values go back, after any save in flight.
    undo(before) {
      stop();
      again = false;
      if (sending) undoNext = before;
      else void run(before);
    },
    // Reload this question: the server's record replaces the card, and its draft goes.
    reset(next) {
      stop();
      again = false;
      undoNext = null;
      current = next;
      saved = valuesOf(next);
      draft = saved;
      outcome = null;
      error = null;
      onUpdate();
    },
    // A newer read of the page: fields the teacher hasn't touched take the server's values. A read asked for before
    // this card's last save is older than it, so it's ignored, as it is during a save or a conflict.
    refresh(next, requestedAt = Infinity) {
      if (next === current || sending || outcome === 'conflict' || requestedAt < savedAt) return;
      const fresh = valuesOf(next);
      const merged = { ...fresh };
      for (const key of Object.keys(draft)) if (!sameField(key, draft[key], saved[key])) merged[key] = draft[key];
      current = next;
      saved = fresh;
      draft = merged;
      if (!pending()) stop();
      onUpdate();
    },
    snapshot() {
      return { values: draft, record: current, status: status(), error, unsaved: pending() };
    },
    destroy() {
      stop();
    },
  };
}
