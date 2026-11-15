// A pupil's live room (SOT-9; #62): the socket, kept open from joining to the end, and the state it builds
// (playState.js). A place the server refuses before letting the pupil in (the quiz closed) ends here.
// Area: quizzes

import { useEffect, useReducer, useRef, useState } from 'react';
import { keepRoomOpen } from '../live/roomSocket';
import { initialPlay, playReducer } from './playState';

// [state, connected, dispatch]. place: { session, guestToken }; onRejected() when the server refuses the place.
export function usePupilRoom(place, { onRejected } = {}) {
  const [state, dispatch] = useReducer(playReducer, undefined, initialPlay);
  const [connected, setConnected] = useState(true);
  const latest = useRef({ onRejected, phase: state.phase });
  useEffect(() => {
    latest.current = { onRejected, phase: state.phase };
  });
  const sessionId = place?.session?.id;
  const token = place?.guestToken;

  useEffect(() => {
    if (!sessionId || !token) return undefined;
    let heard = false;
    return keepRoomOpen(sessionId, {
      role: 'pupil',
      token,
      onOpen: () => setConnected(true),
      onMessage: (message) => {
        heard = true;
        setConnected(true);
        dispatch({ message, now: Date.now() });
      },
      onDrop: (event) => {
        // Refused before any message (its heartbeat timeout also closes with 1008, but after messages).
        if (event.code === 1008 && !heard) {
          latest.current.onRejected?.();
          return true;
        }
        if (latest.current.phase === 'finished') return true;
        setConnected(false);
        return false;
      },
    });
  }, [sessionId, token]);

  return [state, connected, dispatch];
}
