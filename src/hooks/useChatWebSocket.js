// /ata-frontend/src/hooks/useChatWebSocket.js

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

const WEBSOCKET_URL_BASE = 'ws://localhost:8000/api/chatbot/ws';

const useChatWebSocket = (sessionId, setMessages) => {
  const [isThinking, setIsThinking] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const socketRef = useRef(null);
  const messageQueueRef = useRef([]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    socketRef.current = new WebSocket(`${WEBSOCKET_URL_BASE}/${sessionId}`);
    // Do not set isThinking here anymore, let sendMessage handle it.

    socketRef.current.onopen = () => {
      console.log(`WebSocket connection established for session: ${sessionId}`);
      messageQueueRef.current.forEach(msg => socketRef.current.send(JSON.stringify(msg)));
      messageQueueRef.current = [];
    };

    socketRef.current.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      switch (message.type) {
        case 'stream_start':
          setIsThinking(false);
          setIsResponding(true);
          setMessages(prev => [...prev, { id: `msg_bot_${uuidv4()}`, author: 'bot', text: '', isStreaming: true }]);
          break;
        
        case 'stream_token':
          setMessages(prev => prev.map((msg, index) => 
            index === prev.length - 1 ? { ...msg, text: msg.text + message.payload.token } : msg
          ));
          break;
        
        case 'stream_end':
          setIsResponding(false);
          setMessages(prev => prev.map((msg, index) => {
            if (index === prev.length - 1) {
              const { isStreaming, ...finalMsg } = msg;
              return finalMsg;
            }
            return msg;
          }));
          break;
        
        case 'error':
          setIsThinking(false);
          setIsResponding(false);
          setMessages(prev => [...prev, { id: `msg_bot_${uuidv4()}`, author: 'bot', text: message.payload.message }]);
          break;
        
        default:
          console.warn("Received unknown WebSocket message type:", message.type);
      }
    };

    socketRef.current.onclose = () => {
      console.log(`WebSocket connection closed for session: ${sessionId}`);
      setIsThinking(false);
      setIsResponding(false);
    };
    
    socketRef.current.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsThinking(false);
      setIsResponding(false);
      setMessages(prev => [...prev, { id: `msg_bot_${uuidv4()}`, author: 'bot', text: "Sorry, a connection error occurred. Please refresh the page." }]);
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  // --- [THE FIX IS HERE] ---
  // The effect now correctly depends on `sessionId` and `setMessages`.
  // This ensures the `onmessage` handler never has a "stale" version of `setMessages`.
  }, [sessionId, setMessages]);
  // --- [END OF FIX] ---

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

  return { isThinking, isResponding, sendMessage };
};

export default useChatWebSocket;