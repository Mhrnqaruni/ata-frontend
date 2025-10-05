// /ata-frontend/src/pages/Chatbot.jsx (FINAL, DEFINITIVE, RACE-CONDITION-FREE)

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, IconButton } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import HistoryIcon from '@mui/icons-material/History';

import MessageList from '../components/chatbot/MessageList';
import ChatInput from '../components/chatbot/ChatInput';
import ExamplePrompts from '../components/chatbot/ExamplePrompts';
import ChatHistoryPanel from '../components/chatbot/ChatHistoryPanel';
import useChatWebSocket from '../hooks/useChatWebSocket';
import chatService from '../services/chatService';
import { useSnackbar } from '../hooks/useSnackbar';

const Chatbot = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  const [sessions, setSessions] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  
  // The hook is now simpler and only needs setMessages
  const { isThinking, isResponding, connect, sendMessage } = useChatWebSocket(setMessages);

  const fetchHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      const data = await chatService.getChatSessions();
      setSessions(data);
    } catch (error) {
      showSnackbar(error.message, 'error');
    } finally {
      setIsHistoryLoading(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    // This effect connects the WebSocket when a session ID is present.
    if (sessionId) {
      connect(sessionId);
    }
  }, [sessionId, connect]);

  useEffect(() => {
    // This effect loads the message history for the current session.
    const loadSession = async () => {
      if (sessionId) {
        setIsMessagesLoading(true);
        try {
          const sessionDetails = await chatService.getChatSessionDetails(sessionId);
          const formattedMessages = sessionDetails.history.map(msg => ({
            id: msg.id || `msg_hist_${uuidv4()}`, // Prefer the real ID from the DB
            role: msg.role,
            content: msg.content,
            file_id: msg.file_id
          }));
          setMessages(formattedMessages);
        } catch (error) {
          showSnackbar(error.message, 'error');
          navigate('/chat');
        } finally {
          setIsMessagesLoading(false);
        }
      } else {
        // This is the initial state for a new, unsaved chat.
        setMessages([{
          id: `msg_bot_initial`,
          role: 'bot',
          content: "Hello! I'm My Smart Teach, your AI assistant. How can I help you with your teaching tasks today?"
        }]);
      }
    };
    loadSession();
  }, [sessionId, showSnackbar, navigate]);


  const handleHistoryDrawerToggle = () => setIsHistoryDrawerOpen(!isHistoryDrawerOpen);
  const handleNewChat = () => navigate('/chat');
  const handleSessionSelect = (selectedSessionId) => {
    if (sessionId !== selectedSessionId) {
      navigate(`/chat/${selectedSessionId}`);
    }
    setIsHistoryDrawerOpen(false);
  };

  const handleDeleteSession = async (sessionIdToDelete) => {
    try {
      await chatService.deleteChatSession(sessionIdToDelete);
      await fetchHistory();
      if (sessionId === sessionIdToDelete) {
          navigate('/chat', { replace: true });
      }
      showSnackbar('Chat deleted successfully', 'success');
    } catch (error) {
        showSnackbar(error.message, 'error');
    }
  };

  // --- [THE DEFINITIVE FIX IS HERE] ---
  const handleSendMessage = useCallback(async (messageText, fileId = null) => {
    if (!sessionId) {
      // --- Logic for the VERY FIRST message in a NEW chat ---
      try {
        // 1. Create the session on the backend. The backend now saves the first message.
        const { sessionId: newSessionId } = await chatService.createNewChatSession(messageText, fileId);
        
        // 2. Navigate to the new session's URL.
        // This will trigger the useEffect hooks to load the history (which now includes
        // the first message) and connect the WebSocket.
        navigate(`/chat/${newSessionId}`);
        
        // 3. After navigating, we also need to trigger the AI response for the first message.
        // We do this by sending the message over the WebSocket.
        sendMessage(messageText, fileId);

      } catch (error) {
        showSnackbar(error.message, 'error');
      }
    } else {
      // --- Logic for all SUBSEQUENT messages in an EXISTING chat ---
      // This is the standard optimistic update flow.
      const userMessage = {
        id: `msg_client_${uuidv4()}`,
        role: 'user',
        content: messageText,
        file_id: fileId,
      };
      setMessages(prev => [...prev, userMessage]);
      sendMessage(messageText, fileId);
    }
  }, [sessionId, navigate, showSnackbar, sendMessage]);
  // --- [END OF FIX] ---
  
  const handleStopGeneration = () => {
    // TODO: Implement stop generation functionality
  };
  const handleFileUpload = (file) => {
    // TODO: Implement file upload functionality
  };

  const isInputDisabled = isThinking || isResponding || isMessagesLoading;

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px - 48px)' }}>
      <ChatHistoryPanel
        sessions={sessions}
        activeSessionId={sessionId}
        onSessionSelect={handleSessionSelect}
        onNewChat={handleNewChat}
        onDeleteSession={handleDeleteSession}
        isLoading={isHistoryLoading}
        mobileOpen={isHistoryDrawerOpen}
        onMobileClose={() => setIsHistoryDrawerOpen(false)}
      />
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderBottom: 1, borderColor: 'divider', flexShrink: 0 }}>
          <Typography variant="h3" sx={{ flexGrow: 1 }}>Chat</Typography>
          <IconButton
            color="inherit"
            aria-label="open history"
            edge="end"
            onClick={handleHistoryDrawerToggle}
            sx={{ display: { md: 'none' } }}
          >
            <HistoryIcon />
          </IconButton>
        </Box>

        {isMessagesLoading ? (
          <Box sx={{flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <CircularProgress />
          </Box>
        ) : (
          <MessageList messages={messages} isThinking={isThinking}>
            {/* ExamplePrompts are correctly disabled for V1 */}
            {false && !sessionId && messages.length <= 1 && (
              <ExamplePrompts onPromptClick={handleSendMessage} />
            )}
          </MessageList>
        )}
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isInputDisabled}
          isResponding={isResponding}
          onStopGeneration={handleStopGeneration}
          onFileUpload={handleFileUpload}
        />
      </Box>
    </Box>
  );
};

export default Chatbot;