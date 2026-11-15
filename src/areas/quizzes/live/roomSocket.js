// A live run's socket (SOT-9): it opens the run's room for the teacher or a pupil and signs in with the first message,
// never in the address, which servers log. The teacher's live page and the pupils' live page both use it.
// Area: quizzes

// The room's address: the API's own host, on ws:// or wss:// to match its http:// or https://.
export function roomUrl(sessionId, base = import.meta.env.VITE_API_BASE_URL) {
  return `${String(base).replace(/^http/, 'ws')}/api/ws/quiz-sessions/${encodeURIComponent(sessionId)}`;
}

// Opens the room. The teacher signs in with their sign-in token, a pupil with the guest token their join gave them.
export function openRoom(sessionId, { role, token }) {
  const socket = new WebSocket(roomUrl(sessionId));
  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({ type: 'auth', [role === 'host' ? 'token' : 'guest_token']: token }));
  });
  return socket;
}

// Keeps a room open: it reconnects 3 s after the socket drops, and at once when the device is back online or the tab
// is shown again. onMessage gets each message as an object; the server's heartbeat is answered here. Returns stop().
export function keepRoomOpen(sessionId, { role, token, onMessage, onOpen, onDrop }) {
  let socket = null;
  let retry = null;
  let stopped = false;
  const connect = () => {
    clearTimeout(retry);
    if (stopped) return;
    const current = openRoom(sessionId, { role, token });
    socket = current;
    current.onopen = () => onOpen?.();
    current.onmessage = (event) => {
      let message;
      try {
        message = JSON.parse(event.data);
      } catch {
        return;
      }
      if (message?.type === 'ping') current.send(JSON.stringify({ type: 'pong' }));
      else onMessage(message, current);
    };
    current.onclose = (event) => {
      if (stopped || socket !== current) return;
      // A drop the caller treats as final (a refused sign-in, say) returns true, and nothing reconnects.
      if (onDrop?.(event) === true) return;
      retry = setTimeout(connect, 3000);
    };
  };
  const again = () => {
    if (document.visibilityState === 'visible' && socket && socket.readyState > WebSocket.OPEN) connect();
  };
  window.addEventListener('online', again);
  document.addEventListener('visibilitychange', again);
  connect();
  return () => {
    stopped = true;
    clearTimeout(retry);
    window.removeEventListener('online', again);
    document.removeEventListener('visibilitychange', again);
    socket?.close();
  };
}
