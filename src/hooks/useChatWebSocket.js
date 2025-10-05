
// /ata-frontend/src/hooks/useChatWebSocket.js (FINAL, SECURE, SUPERVISOR-APPROVED)

import { useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

/**
 * A custom React hook to manage a real-time WebSocket connection for the chatbot.
 *
 * This hook is now fully "user-aware." It is responsible for securely authenticating
 * the WebSocket connection by retrieving the user's JWT from localStorage and
 * appending it as a query parameter to the connection URL, fulfilling the backend's
 * security contract.
 *
 * @param {function} setMessages - The state setter function from the parent component's
 *                                 `useState` for managing the list of chat messages.
 * @returns {object} An object containing the connection state and functions to interact
 *                   with the WebSocket.
 */
const useChatWebSocket = (setMessages) => {
  // --- State Management (Unchanged) ---
  // These states track the UI/UX of the chat interaction.
  const [isThinking, setIsThinking] = useState(false);      // True from user send until first token arrives.
  const [isResponding, setIsResponding] = useState(false);  // True while the AI is streaming tokens.
  const [isConnected, setIsConnected] = useState(false);

  // --- Refs for Stable References (Unchanged) ---
  const socketRef = useRef(null);         // Holds the current WebSocket object.
  const messageQueueRef = useRef([]);     // Queues messages if `sendMessage` is called before connection.
  const currentSessionId = useRef(null);  // Tracks the current session to prevent redundant connections.

  /**
   * The core function to establish a WebSocket connection.
   * This function is now responsible for authentication.
   */
  const connect = useCallback((sessionId) => {
    // Prevent re-connecting to the same session or connecting without an ID.
    if (!sessionId || (socketRef.current && currentSessionId.current === sessionId && socketRef.current.readyState < 2)) {
      return;
    }
    
    currentSessionId.current = sessionId;
    
    // If there's an old connection, close it first.
    if (socketRef.current) {
      socketRef.current.close();
    }

    // --- [CRITICAL SECURITY MODIFICATION 1/3: RETRIEVE THE TOKEN] ---
    // Get the user's authentication token from the same place the api.js interceptor does.
    const token = localStorage.getItem('authToken');

    // --- [CRITICAL SECURITY MODIFICATION 2/3: HANDLE MISSING TOKEN] ---
    // If no token exists, the user is not logged in. We cannot proceed.
    // This is a crucial client-side check to prevent an unnecessary and
    // guaranteed-to-fail connection attempt.
    if (!token) {
      console.error("useChatWebSocket: No auth token found. Cannot connect.");
      // In a real app, you might want to show a snackbar error here as well.
      return;
    }

    // --- [CRITICAL SECURITY MODIFICATION 3/3: CONSTRUCT THE SECURE URL] ---
    // Append the token as a query parameter named 'token'. The backend's
    // chatbot_router is specifically designed to look for this parameter.
    const wsUrl = `${config.wsBaseUrl}/api/chatbot/ws/${sessionId}?token=${token}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    // --- WebSocket Event Handlers (Logic is unchanged, but now operate on a secure connection) ---
    ws.onopen = () => {
      setIsConnected(true);
      messageQueueRef.current.forEach(msg => ws.send(JSON.stringify(msg)));
      messageQueueRef.current = [];
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      switch (message.type) {
        case 'stream_start':
          setIsThinking(false);
          setIsResponding(true);
          setMessages(prev => [...prev, { id: `msg_bot_${uuidv4()}`, role: 'bot', content: '', isStreaming: true }]);
          break;
        case 'stream_token':
          setMessages(prev => prev.map((m, i) => i === prev.length - 1 ? { ...m, content: m.content + message.payload.token } : m));
          break;
        case 'stream_end':
          setIsResponding(false);
          setMessages(prev => prev.map((m, i) => {
              if (i === prev.length - 1) {
                  const { isStreaming, ...finalMsg } = m;
                  return finalMsg;
              }
              return m;
          }));
          break;
        case 'error':
          setIsThinking(false);
          setIsResponding(false);
          setMessages(prev => [...prev, { id: `msg_bot_${uuidv4()}`, role: 'bot', content: message.payload.message }]);
          break;
        default:
          console.warn("Received unknown WebSocket message type:", message.type);
      }
    };

    ws.onclose = (event) => {
      // If the close code is 1008, it's likely an auth failure from the backend.
      if (event.code === 1008) {
          // WebSocket closed due to policy violation - likely auth error
      }
      setIsConnected(false);
      setIsThinking(false);
      setIsResponding(false);
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
      setIsThinking(false);
      setIsResponding(false);
    };

  }, [setMessages]); // The dependency array is correct.

  // The sendMessage function remains unchanged.
  const sendMessage = useCallback((messageText, fileId = null) => {
    const payload = { 
      type: 'user_message', 
      payload: { 
        text: messageText,
        file_id: fileId
      } 
    };

    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload));
    } else {
      messageQueueRef.current.push(payload);
    }
    setIsThinking(true);
  }, []);

  return { isThinking, isResponding, isConnected, connect, sendMessage };
};

export default useChatWebSocket;