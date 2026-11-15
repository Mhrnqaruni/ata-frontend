// Copying, for the joining parts (design.md §3.7, §3.9, §6): it writes to the clipboard, then says "Copied ✓" in
// place for 2 s, or "Couldn't copy" when the browser refuses, as on a page that isn't https.
// Area: quizzes

import { useEffect, useRef, useState } from 'react';

const SHOWN_MS = 2000;

// [done, copy]: copy(key, write) runs write(), which returns a promise, and `done` is { key, ok } for 2 s after it.
export function useCopy() {
  const [done, setDone] = useState(null);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copy = async (key, write) => {
    let ok = true;
    try {
      await write();
    } catch {
      ok = false;
    }
    clearTimeout(timer.current);
    setDone({ key, ok });
    timer.current = setTimeout(() => setDone(null), SHOWN_MS);
    return ok;
  };
  return [done, copy];
}

// Writes text to the clipboard.
export const copyText = (text) => navigator.clipboard.writeText(text);

// The style of a live region that only screen readers read: each copying part says "Copied ✓" in one.
export const srOnly = {
  position: 'absolute',
  width: '1px', // a number would be MUI's 100% (W6: the live page grew to 2086 px)
  height: '1px',
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};
