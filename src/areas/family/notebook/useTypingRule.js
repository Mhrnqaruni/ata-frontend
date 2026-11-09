// The phone keyboard rule (C-13, design §3.3): while the chat's input has focus, <html data-fam-typing> says so, and
// says "short" while the visible screen, keyboard included, is under 600 px. notebook.css and shell.css do the hiding.
// Area: family

import { useEffect } from 'react';

const INPUT = '.fam-compose-input'; // the chat's message box (FamilyConversation)

/** For the page that holds the chat. Focus is followed on the document, so the chat itself needs no wiring. */
export default function useTypingRule() {
  useEffect(() => {
    const root = document.documentElement;
    const view = window.visualViewport;
    const isInput = (node) => node instanceof Element && !!node.closest(INPUT);
    // The visual viewport shrinks when the keyboard opens, on iPhones too, where the layout viewport doesn't.
    const mark = () =>
      root.setAttribute('data-fam-typing', (view?.height ?? window.innerHeight) < 600 ? 'short' : 'true');
    const stop = () => {
      view?.removeEventListener('resize', mark);
      root.removeAttribute('data-fam-typing');
    };
    function onFocusIn(event) {
      if (!isInput(event.target)) return;
      mark();
      view?.addEventListener('resize', mark);
    }
    function onFocusOut(event) {
      if (isInput(event.target)) stop();
    }
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
      stop();
    };
  }, []);
}
