// The review pages' guard for changes not yet saved (SOT-6, kept from the assessment page): the browser asks before a
// reload or close, and the app asks before an in-app link or the header's Back button leaves the page.
// Area: platform

import { useEffect } from 'react';
import { REVIEW } from './words';

// count: the cards with a change that isn't saved; backLabel: the header Back button's label, which it also catches.
export default function useLeaveGuard(count, backLabel) {
  useEffect(() => {
    if (!count) return undefined;
    const unload = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const leave = (event) => {
      const anchor = event.target.closest?.('a[href]');
      const back = backLabel ? event.target.closest?.(`button[aria-label="${backLabel}"]`) : null;
      const away = anchor && anchor.origin === window.location.origin && anchor.pathname !== window.location.pathname;
      if ((away || back) && !window.confirm(REVIEW.leave(count))) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', unload);
    document.addEventListener('click', leave, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      document.removeEventListener('click', leave, true);
    };
  }, [count, backLabel]);
}
