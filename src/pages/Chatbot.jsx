// /ata-frontend/src/pages/Chatbot.jsx (DEFINITIVELY CORRECTED AND CONSISTENT)

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
  
  const { isThinking, isResponding, sendMessage } = useChatWebSocket(sessionId, setMessages);

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
    const loadSession = async () => {
      if (sessionId) {
        setIsMessagesLoading(true);
        try {
          const sessionDetails = await chatService.getChatSessionDetails(sessionId);
          
          // --- [THE FIX IS HERE - STEP 1: Standardize History Loading] ---
          // Map the backend data to our new, consistent frontend message shape.
          const formattedMessages = sessionDetails.history.map(msg => ({
            id: `msg_hist_${uuidv4()}`,
            role: msg.role, // Use 'role' directly
            content: msg.content, // Use 'content' directly
            file_id: msg.file_id
          }));
          // --- [END OF FIX] ---
          setMessages(formattedMessages);

        } catch (error) {
          showSnackbar(error.message, 'error');
          navigate('/chat');
        } finally {
          setIsMessagesLoading(false);
        }
      } else {
        // --- [THE FIX IS HERE - STEP 2: Standardize Initial Message] ---
        setMessages([{
          id: `msg_bot_${uuidv4()}`,
          role: 'bot', // Use 'role'
          content: "Hello! I'm My Smart Teach, your AI assistant. How can I help you with your teaching tasks today?" // Use 'content'
        }]);
        // --- [END OF FIX] ---
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

  const handleSendMessage = useCallback(async (messageText, fileId = null) => {
    // --- [THE FIX IS HERE - STEP 3: Standardize New User Message] ---
    const userMessage = {
      id: `msg_client_${uuidv4()}`,
      role: 'user', // Use 'role'
      content: messageText, // Use 'content'
      file_id: fileId,
    };
    // --- [END OF FIX] ---
    setMessages(prev => [...prev, userMessage]);

    if (!sessionId) {
      try {
        const { sessionId: newSessionId } = await chatService.createNewChatSession(messageText, fileId);
        navigate(`/chat/${newSessionId}`, { replace: true });
        sendMessage(messageText, fileId);
      } catch (error) {
        showSnackbar(error.message, 'error');
      }
    } else {
      sendMessage(messageText, fileId);
    }
  }, [sessionId, navigate, showSnackbar, sendMessage]);
  
  const handleStopGeneration = () => console.log("Stop generation requested.");
  const handleFileUpload = (file) => console.log("File uploaded:", file.name);

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
            {!sessionId && messages.length <= 1 && <ExamplePrompts onPromptClick={handleSendMessage} />}
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