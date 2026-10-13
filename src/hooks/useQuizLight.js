// /src/hooks/useQuizLight.js
// The quiz builder's calm light: one diagonal band passes behind the glass 400ms after the page opens, on each
// step change or mode choice, then once every 18s while idle. It skips a pass while someone is typing in a
// field or the tab is hidden, and never runs with reduced motion.

import { useCallback, useEffect, useRef, useState } from "react";

const IDLE_MS = 18000;
const typing = () => {
  const el = document.activeElement;
  return Boolean(el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable));
};
const reduced = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export default function useQuizLight() {
  const [run, setRun] = useState(null);
  const idle = useRef(null);

  const play = useCallback(() => {
    if (reduced() || document.hidden || typing()) return;
    setRun((r) => (r === "a" ? "b" : "a"));
  }, []);

  useEffect(() => {
    const first = setTimeout(play, 400);
    idle.current = setInterval(play, IDLE_MS);
    return () => {
      clearTimeout(first);
      clearInterval(idle.current);
    };
  }, [play]);

  return { run, play };
}
