// /ata-frontend/src/hooks/useChatWebSocket.js (FINAL, DEFINITIVELY CORRECTED)

import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config';

const useChatWebSocket = (sessionId, setMessages) => {
  const [isThinking, setIsThinking] = useState(false);
  const [isResponding, setIsResponding] = useState(false);
  const socketRef = useRef(null);
  const messageQueueRef = useRef([]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    const wsUrl = `${config.wsBaseUrl}/api/chatbot/ws/${sessionId}`;
    console.log(`Attempting to connect WebSocket to: ${wsUrl}`);
    
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      console.log(`WebSocket connection established for session: ${sessionId}`);
      messageQueueRef.current.forEach(msg => ws.send(JSON.stringify(msg)));
      messageQueueRef.current = [];
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      
      // --- [THE DEFINITIVE FIX IS HERE] ---
      switch (message.type) {
        case 'stream_start':
          setIsThinking(false);
          setIsResponding(true);
          // Create the initial bot message object with the correct properties
          // The key properties are `role: 'bot'` and `content: ''`
          setMessages(prev => [...prev, { id: `msg_bot_${uuidv4()}`, role: 'bot', content: '', isStreaming: true }]);
          break;
        
        case 'stream_token':
          // Update the last message in the array by appending the new token
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'bot' && lastMessage.isStreaming) {
              // Create a new array with the updated last message
              return [
                ...prev.slice(0, -1),
                { ...lastMessage, content: lastMessage.content + message.payload.token }
              ];
            }
            return prev;
          });
          break;
        
        case 'stream_end':
          setIsResponding(false);
          // Finalize the last message by removing the isStreaming flag
          setMessages(prev => {
            const lastMessage = prev[prev.length - 1];
            if (lastMessage && lastMessage.role === 'bot' && lastMessage.isStreaming) {
              const { isStreaming, ...finalMsg } = lastMessage;
              return [...prev.slice(0, -1), finalMsg];
            }
            return prev;
          });
          break;
        
        case 'error':
          setIsThinking(false);
          setIsResponding(false);
          // Add a bot error message with the correct properties
          setMessages(prev => [...prev, { id: `msg_bot_${uuidv4()}`, role: 'bot', content: message.payload.message }]);
          break;
        
        default:
          console.warn("Received unknown WebSocket message type:", message.type);
      }
      // --- [END OF FIX] ---
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