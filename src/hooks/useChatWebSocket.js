// /ata-frontend/src/hooks/useChatWebSocket.js (FINAL, DEFINITIVELY CORRECTED V2)

import { useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

const useChatWebSocket = (setMessages) => {
  const [isThinking, setIsThinking] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const messageQueueRef = useRef([]);
  const currentSessionId = useRef(null);

  const connect = useCallback((sessionId) => {
    // Prevent re-connecting to the same session or connecting without an ID
    if (!sessionId || (socketRef.current && currentSessionId.current === sessionId && socketRef.current.readyState < 2)) {
      return;
    }
    
    currentSessionId.current = sessionId;
    
    // If there's an old connection, close it first.
    if (socketRef.current) {
      socketRef.current.close();
    }

    const wsUrl = `${config.wsBaseUrl}/api/chatbot/ws/${sessionId}`;
    console.log(`Connecting WebSocket to: ${wsUrl}`);
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log(`WebSocket connection established for session: ${sessionId}`);
      setIsConnected(true);
      // Send any messages that were queued while we were connecting
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

    ws.onclose = () => {
      console.log(`WebSocket connection closed for session: ${sessionId}`);
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

  }, [setMessages]); // The connect function itself is stable and doesn't need to be recreated often.

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
      // If not connected, queue the message. The onopen handler will send it.
      messageQueueRef.current.push(payload);
    }
    setIsThinking(true);
  }, []);

  return { isThinking, isResponding, isConnected, connect, sendMessage };
};

export default useChatWebSocket;