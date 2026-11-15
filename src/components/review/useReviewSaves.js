// A review page's save model (Phase 1.47 SOT-6; design.md §3.9): a saver for each question card, refreshed from each
// new read of the page, the toast with its Undo, and how many changes aren't saved yet, for the leave guard.
// Area: platform

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { createCardSaver } from './cardSaver';
import { REVIEW } from './words';

const nothing = () => {};

/**
 * records: the cards that can be marked, from the page's last read (keep the array stable between renders).
 * idOf(record) names a card. valuesOf, isValid and save are createCardSaver's.
 * canUndo(before): whether the toast may offer Undo for a change made from that record (default: yes).
 * requestedAt: when the read behind `records` was asked for, so a read older than a save never undoes it.
 * Returns { card(record), unsaved, toast, closeToast }; card(record) gives the card's values, status and handlers.
 */
export default function useReviewSaves({ records, idOf, valuesOf, isValid, save, canUndo, requestedAt = 0 }) {
  const savers = useRef(new Map());
  const page = useRef({ idOf, valuesOf, isValid, save, canUndo });
  const [, rerender] = useReducer((count) => count + 1, 0);
  const [toast, setToast] = useState({ open: false, key: 0, message: '' });

  // The page's newest functions, read whenever a saver needs one, so a saver outlives any render.
  useEffect(() => {
    page.current = { idOf, valuesOf, isValid, save, canUndo };
  });

  // A save landed: "Mark changed · Undo", or "Restored" after an Undo.
  const landed = useCallback((id, { before, undo }) => {
    if (undo) setToast({ open: true, key: Date.now(), message: REVIEW.restored });
    else if (page.current.canUndo ? page.current.canUndo(before) : true)
      setToast({
        open: true,
        key: Date.now(),
        message: REVIEW.markChanged,
        undo: () => savers.current.get(id)?.undo(before),
      });
  }, []);

  // A saver for each card, refreshed from each new read; a card that's gone stops.
  useEffect(() => {
    const seen = new Set();
    let changed = false;
    for (const record of records || []) {
      const id = String(page.current.idOf(record));
      seen.add(id);
      const saver = savers.current.get(id);
      if (saver) {
        saver.refresh(record, requestedAt);
        continue;
      }
      changed = true;
      savers.current.set(
        id,
        createCardSaver({
          record,
          valuesOf: (item) => page.current.valuesOf(item),
          isValid: (values, item) => page.current.isValid(values, item),
          save: (values, item, options) => page.current.save(values, item, options),
          onUpdate: rerender,
          onSaved: (event) => landed(id, event),
        })
      );
    }
    for (const [id, saver] of savers.current) {
      if (seen.has(id)) continue;
      saver.destroy();
      savers.current.delete(id);
      changed = true;
    }
    if (changed) rerender();
  }, [records, requestedAt, landed]);

  // Leaving the page saves what waits for a quiet moment, then stops the timers.
  useEffect(() => {
    const all = savers.current;
    return () => {
      for (const saver of all.values()) {
        saver.leave();
        saver.destroy();
      }
    };
  }, []);

  const card = (record) => {
    const saver = savers.current.get(String(idOf(record)));
    if (!saver) {
      const values = valuesOf(record);
      const idle = { status: 'idle', error: null, unsaved: false };
      return { ...idle, values, record, edit: nothing, leave: nothing, retry: nothing, reset: nothing };
    }
    return { ...saver.snapshot(), edit: saver.edit, leave: saver.leave, retry: saver.retry, reset: saver.reset };
  };
  const unsaved = [...savers.current.values()].filter((saver) => saver.snapshot().unsaved).length;
  const closeToast = useCallback(() => setToast((now) => ({ ...now, open: false })), []);
  return { card, unsaved, toast, closeToast };
}
