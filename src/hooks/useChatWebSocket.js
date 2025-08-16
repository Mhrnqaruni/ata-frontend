// /ata-frontend/src/hooks/useChatWebSocket.js (FINAL, PRODUCTION-READY VERSION)

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
// --- [THE FIX IS HERE - STEP 1: IMPORT THE CONFIG] ---
import { config } from '../config';
// --- [END OF FIX] ---

// --- [THE FIX IS HERE - STEP 2: REMOVE THE HARDCODED CONSTANT] ---
// const WEBSOCKET_URL_BASE = 'ws://localhost:8000/api/chatbot/ws'; // This is the line we are removing
// --- [END OF FIX] ---

const useChatWebSocket = (sessionId, setMessages) => {
  const [isThinking, setIsThinking] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const socketRef = useRef(null);
  const messageQueueRef = useRef([]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    // --- [THE FIX IS HERE - STEP 3: USE THE DYNAMIC URL] ---
    // Construct the full, correct WebSocket URL using our new, intelligent config.
    // This will be 'ws://localhost:8000/...' in development and
    // 'wss://ata-backend-api-production.up.railway.app/...' in production.
    const wsUrl = `${config.wsBaseUrl}/api/chatbot/ws/${sessionId}`;
    // --- [END OF FIX] ---

    console.log(`Attempting to connect WebSocket to: ${wsUrl}`); // This log is now much more useful for debugging
    
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log(`WebSocket connection established for session: ${sessionId}`);
      messageQueueRef.current.forEach(msg => socketRef.current.send(JSON.stringify(msg)));
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
          setMessages(prev => prev.map((msg, index) => 
            index === prev.length - 1 ? { ...msg, content: msg.content + message.payload.token } : msg
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
          setMessages(prev => [...prev, { id: `msg_bot_${uuidv4()}`, role: 'bot', content: message.payload.message }]);
          break;
        
        default:
          console.warn("Received unknown WebSocket message type:", message.type);
      }
    };

    ws.onclose = () => {
      console.log(`WebSocket connection closed for session: ${sessionId}`);
      setIsThinking(false);
      setIsResponding(false);
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setIsThinking(false);
      setIsResponding(false);
      setMessages(prev => [...prev, { id: `msg_bot_${uuidv4()}`, role: 'bot', content: "Sorry, a connection error occurred. Please refresh the page." }]);
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [sessionId, setMessages]);

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