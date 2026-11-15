// The teacher's live room (SOT-9): the run's socket, kept open while the quiz runs, and the room state it builds
// (roomState.js). A join, a leave or a walk-in tells the page to read who is in the room again.
// Area: quizzes

import { useEffect, useReducer, useRef, useState } from 'react';
import { keepRoomOpen } from './roomSocket';
import { FINISHED, initialRoom, roomReducer } from './roomState';

// The messages after which the page reads who is in the room again.
const PEOPLE_CHANGE = new Set(['participant_joined', 'participant_left', 'roster_updated', 'outsider_detected']);

// [room, connected]: the room state, and whether the socket is open (false shows "Reconnecting…").
export function useHostRoom(run, { onPeopleChange } = {}) {
  const [room, dispatch] = useReducer(roomReducer, run, initialRoom);
  const [connected, setConnected] = useState(true);
  const latest = useRef(onPeopleChange);
  useEffect(() => {
    latest.current = onPeopleChange;
  });
  const sessionId = run?.id;
  const open = Boolean(run) && !FINISHED.includes(run.status) && !FINISHED.includes(room.status);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!open || !sessionId || !token) return undefined;
    // A class joining at once is one read of who is in the room, 400 ms after the last join.
    let reread = null;
    const stop = keepRoomOpen(sessionId, {
      role: 'host',
      token,
      onOpen: () => setConnected(true),
      onDrop: () => setConnected(false),
      onMessage: (message) => {
        if (PEOPLE_CHANGE.has(message.type)) {
          clearTimeout(reread);
          reread = setTimeout(() => latest.current?.(message), 400);
        }
        dispatch({ message, now: Date.now() });
      },
    });
    return () => {
      clearTimeout(reread);
      stop();
    };
  }, [open, sessionId]);

  return [room, connected];
}
