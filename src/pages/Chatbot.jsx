// /ata-frontend/src/pages/Chatbot.jsx

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
          const formattedMessages = sessionDetails.history.map(msg => ({
            id: `msg_hist_${uuidv4()}`,
            author: msg.role === 'model' ? 'bot' : msg.role,
            text: msg.content,
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
        setMessages([{
          id: `msg_bot_${uuidv4()}`,
          author: 'bot',
          text: "Hello! I'm your MST assistant. How can I help you analyze your teaching data today?"
        }]);
      }
    };
    loadSession();
  }, [sessionId, showSnackbar, navigate]);


  const handleHistoryDrawerToggle = () => {
    setIsHistoryDrawerOpen(!isHistoryDrawerOpen);
  };

  const handleNewChat = () => {
    if (sessionId) {
      navigate('/chat');
    }
  };

  const handleSessionSelect = (selectedSessionId) => {
    if (sessionId !== selectedSessionId) {
      navigate(`/chat/${selectedSessionId}`);
    }
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
    const userMessage = {
      id: `msg_client_${uuidv4()}`,
      author: 'user',
      text: messageText,
      file_id: fileId,
    };
    setMessages(prev => [...prev, userMessage]);

    if (!sessionId) {
      try {
        const { sessionId: newSessionId } = await chatService.createNewChatSession(messageText, fileId);
        // We now have the newSessionId. Navigate to it.
        // The useChatWebSocket hook will see this change and connect.
        // It will also correctly queue the message to be sent on connection.
        navigate(`/chat/${newSessionId}`, { replace: true });
        // The first message MUST now be sent by the hook, we must call sendMessage
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
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0
        }}>
          <Typography variant="h3" sx={{ flexGrow: 1 }}>
            Chat
          </Typography>
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
          <MessageList
            messages={messages}
            isThinking={isThinking}
          >
            {/* --- [THE FIX IS HERE: FEATURE FLAG] --- */}
            {/* Temporarily disable ExamplePrompts for V1 by setting the condition to false. */}
            {/* V2 TODO: Re-enable by changing this back to: !sessionId && messages.length <= 1 */}
            {false && !sessionId && messages.length <= 1 && <ExamplePrompts onPromptClick={handleSendMessage} />}
            {/* --- [END OF FIX] --- */}
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