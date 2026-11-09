// A dialog that the browser's Back closes (C-18, design §3.16): opening adds ?dialog=<name> as its own history entry,
// and a Refresh keeps the address, so the dialog reopens, empty.
// Area: family

import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

/**
 * The address the component last showed (`.current`), or null once it has gone. Work that finishes after a wait reads
 * it before closing a dialog or replacing the page, as Back may have done that meanwhile.
 */
export function useLiveLocation() {
  const location = useLocation();
  const live = useRef(location);
  useEffect(() => {
    live.current = location;
    return () => {
      live.current = null;
    };
  }, [location]);
  return live;
}

/** Whether the dialog called `name` is open at `location`, such as a live location's current value. */
export const openAt = (location, name) => new URLSearchParams(location?.search ?? '').get('dialog') === name;

/** [open, show, hide] for the dialog called `name`. */
export default function useDialogParam(name) {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const live = useLiveLocation();
  const navigate = useNavigate();
  const open = params.get('dialog') === name;
  function show() {
    if (open) return;
    const next = new URLSearchParams(params);
    next.set('dialog', name);
    setParams(next, { state: { ...location.state, dialog: true } });
  }
  function hide() {
    if (!open || !openAt(live.current, name)) return; // Closed meanwhile, or the page has gone.
    // Opened here, so step back over its entry. Opened from a link, with no entry of ours, so only drop the value.
    if (location.state?.dialog) {
      navigate(-1);
      return;
    }
    const next = new URLSearchParams(params);
    next.delete('dialog');
    setParams(next, { replace: true, state: location.state });
  }
  return [open, show, hide];
}

/**
 * Opens a dialog by its name, as show() does, for an opener with several, such as the Notebook's Make menu. `state`
 * travels in the dialog's history entry, such as the materials a make dialog starts with ticked. `replace` puts it in
 * the place of what is open, and closing it then does what closing that would: after another dialog, Back still
 * returns to the page; over a page, it closes onto that page.
 */
export function useOpenDialog() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  return (name, state, { replace = false } = {}) => {
    const next = new URLSearchParams(params);
    next.set('dialog', name);
    setParams(next, {
      replace,
      state: { ...location.state, ...state, dialog: replace ? !!location.state?.dialog : true },
    });
  };
}
