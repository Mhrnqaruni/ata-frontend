// Next question while typed answers are being marked (design.md §3.4): the press waits for the marks, so the class sees
// the right count before the quiz moves on, and goes as soon as they arrive (after 20 s at most, so nothing is stuck).
// Area: quizzes

import { useEffect, useRef, useState } from 'react';

const MOVES_ON = new Set(['next', 'finish']);
const MOST_MS = 20000;

// press(action) runs a main button; marking: C2's marks_pending; questionId: the open question. Returns [pressOrWait,
// waiting]: pressOrWait runs a press at once, or holds a move on while marking; waiting shows "Marking… one moment".
export function useMarkingWait(press, { marking, questionId }) {
  const [held, setHeld] = useState(null); // { action, questionId }
  const latest = useRef(press);
  useEffect(() => {
    latest.current = press;
  });

  useEffect(() => {
    if (!held) return undefined;
    // The quiz moved on by itself (its pause ended): the held press is spent.
    const spent = held.questionId !== questionId;
    const go = () => {
      setHeld(null);
      if (!spent) latest.current(held.action);
    };
    const timer = setTimeout(go, spent || !marking ? 0 : MOST_MS);
    return () => clearTimeout(timer);
  }, [held, marking, questionId]);

  const pressOrWait = (action) => {
    if (marking && MOVES_ON.has(action)) setHeld({ action, questionId });
    else press(action);
  };
  return [pressOrWait, Boolean(held)];
}
