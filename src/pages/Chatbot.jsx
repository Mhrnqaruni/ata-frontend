// /ata-frontend/src/pages/Chatbot.jsx (FINAL, DEFINITIVE, RACE-CONDITION-FREE)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, CircularProgress, Typography, IconButton, Tooltip, Paper, Chip, Button } from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import HistoryIcon from '@mui/icons-material/History';
import DownloadIcon from '@mui/icons-material/Download';

import MessageList from '../components/chatbot/MessageList';
import ChatInput from '../components/chatbot/ChatInput';
import ChatWelcome from '../components/chatbot/ChatWelcome';
import ChatHistoryMenu from '../components/chatbot/ChatHistoryMenu';
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
  const [disambiguationOptions, setDisambiguationOptions] = useState(null);
  const [stage, setStage] = useState(null);

  // History menu state
  const [historyAnchor, setHistoryAnchor] = useState(null);

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);

  // Smart scroll tracking
  const messagesBoxRef = useRef(null);
  const userHasScrolledUp = useRef(false);
  const lastMessageCount = useRef(0);

  // WebSocket hook with inline charts enabled
  const { isThinking, isResponding, connect, sendMessage } = useChatWebSocket(
    setMessages,
    { inlineCharts: true }
  );

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
            file_id: msg.file_id,
            charts: msg.metadata?.charts || []
          }));
          setMessages(formattedMessages);
        } catch (error) {
          showSnackbar(error.message, 'error');
          navigate('/chat');
        } finally {
          setIsMessagesLoading(false);
        }
      } else {
        // This is the initial state for a new, unsaved chat - keep messages EMPTY to show ChatWelcome
        setMessages([]);
      }
    };
    loadSession();
  }, [sessionId, showSnackbar, navigate]);

  useEffect(() => {
    if (!sessionId || !window.currentChatWebSocket) return;

    const handleDisambiguation = (event) => {
      const { entity_type, matches, message: disambigMessage } = event.detail;
      setDisambiguationOptions({
        entityType: entity_type,
        matches: matches,
        message: disambigMessage
      });
    };

    const handleStageUpdate = (event) => {
      setStage(event.detail.stage);
    };

    window.currentChatWebSocket.addEventListener('disambiguation', handleDisambiguation);
    window.currentChatWebSocket.addEventListener('stage_update', handleStageUpdate);

    return () => {
      if (window.currentChatWebSocket) {
        window.currentChatWebSocket.removeEventListener('disambiguation', handleDisambiguation);
        window.currentChatWebSocket.removeEventListener('stage_update', handleStageUpdate);
      }
    };
  }, [sessionId]);

  // Clear stage chip when chatbot finishes responding
  useEffect(() => {
    if (!isResponding && !isThinking) {
      setStage(null);
    }
  }, [isResponding, isThinking]);

  // Smart scroll: detect if user manually scrolled up
  const handleMessagesScroll = useCallback(() => {
    if (!messagesBoxRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesBoxRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    userHasScrolledUp.current = distanceFromBottom > 100;
  }, []);

  // Smart scroll: auto-scroll to bottom only when appropriate
  useEffect(() => {
    if (!messagesBoxRef.current) return;

    const isNewMessage = messages.length !== lastMessageCount.current;
    lastMessageCount.current = messages.length;

    if (isNewMessage) {
      userHasScrolledUp.current = false;
      messagesBoxRef.current.scrollTo({
        top: messagesBoxRef.current.scrollHeight,
        behavior: 'smooth'
      });
    } else if (!userHasScrolledUp.current && (isResponding || isThinking)) {
      messagesBoxRef.current.scrollTo({
        top: messagesBoxRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, isResponding, isThinking]);


  // History menu handlers
  const handleOpenHistory = useCallback((event) => {
    setHistoryAnchor(event.currentTarget);
  }, []);

  const handleCloseHistory = useCallback(() => {
    setHistoryAnchor(null);
  }, []);

  const handleNewChat = useCallback(() => {
    handleCloseHistory();
    navigate('/chat');
  }, [navigate, handleCloseHistory]);

  const handleSessionSelect = useCallback((selectedSessionId) => {
    handleCloseHistory();
    if (sessionId !== selectedSessionId) {
      navigate(`/chat/${selectedSessionId}`);
    }
  }, [sessionId, navigate, handleCloseHistory]);

  const handleDisambiguationSelect = (selectedEntity) => {
    const entityName = selectedEntity.name || selectedEntity.title || 'that';
    const entityType = selectedEntity.entity_type || disambiguationOptions.entityType;
    const context = {
      entity_type: entityType,
      entity_id: selectedEntity.id,
      entity_name: entityName
    };
    sendMessage(`Show me an overview of ${entityName}`, null, context);
    setDisambiguationOptions(null);
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

  // Download report handler
  const handleDownloadReport = useCallback(async () => {
    if (!sessionId) {
      showSnackbar('No chat session to export', 'warning');
      return;
    }

    setIsDownloading(true);
    try {
      await chatService.downloadChatReport(sessionId, `chat_report_${sessionId}.docx`);
      showSnackbar('Report downloaded successfully', 'success');
    } catch (error) {
      showSnackbar(error.message, 'error');
    } finally {
      setIsDownloading(false);
    }
  }, [sessionId, showSnackbar]);

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
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px - 48px)', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <Paper
        elevation={2}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          bgcolor: 'background.paper',
          borderRadius: 0,
          flexShrink: 0  // Prevent header from shrinking
        }}
      >
        {/* LEFT SIDE: Title + Stage */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            Chat Assistant
          </Typography>
          {stage && (
            <Chip size="small" label={stage} color="info" variant="outlined" />
          )}
        </Box>

        {/* RIGHT SIDE: History + Download buttons */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Chat History">
            <IconButton onClick={handleOpenHistory}>
              <HistoryIcon />
            </IconButton>
          </Tooltip>

          <Button
            variant="outlined"
            startIcon={isDownloading ? <CircularProgress size={16} /> : <DownloadIcon />}
            onClick={handleDownloadReport}
            disabled={!sessionId || isDownloading}
            sx={{
              whiteSpace: 'nowrap',
              textTransform: 'none',
              fontWeight: 500
            }}
          >
            {isDownloading ? 'Generating...' : 'Download as Report'}
          </Button>
        </Box>
      </Paper>

      {/* Messages Area */}
      <Box
        ref={messagesBoxRef}
        onScroll={handleMessagesScroll}
        sx={{
          flex: 1,
          minHeight: 0,  // CRITICAL: Allow flex shrinking
          overflow: 'auto',
          bgcolor: 'background.default'
        }}
      >
        {isMessagesLoading ? (
          <Box sx={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            {/* Disambiguation UI */}
            {disambiguationOptions && (
              <Box
                sx={{
                  m: 2,
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <Typography variant="subtitle1" gutterBottom>
                  {disambiguationOptions.message}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 2 }}>
                  {disambiguationOptions.matches.map((match, index) => (
                    <Box
                      key={index}
                      onClick={() => handleDisambiguationSelect(match)}
                      sx={{
                        p: 2,
                        border: '1px solid',
                        borderColor: 'primary.main',
                        borderRadius: 1,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        '&:hover': {
                          bgcolor: 'primary.light',
                          transform: 'translateX(4px)'
                        }
                      }}
                    >
                      <Typography variant="body1" fontWeight="bold">
                        {match.name || match.title}
                      </Typography>
                      {match.studentId && (
                        <Typography variant="caption" color="text.secondary">
                          Student ID: {match.studentId}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {messages.length === 0 ? (
              <ChatWelcome onSend={handleSendMessage} entityName={null} />
            ) : (
              <MessageList messages={messages} isThinking={isThinking} />
            )}
          </>
        )}
      </Box>

      {/* Input Area */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isInputDisabled}
        isResponding={isResponding}
        onStopGeneration={handleStopGeneration}
      />

      {/* History Menu */}
      <ChatHistoryMenu
        anchorEl={historyAnchor}
        open={Boolean(historyAnchor)}
        onClose={handleCloseHistory}
        sessions={sessions}
        loading={isHistoryLoading}
        onSelect={handleSessionSelect}
        onNewChat={handleNewChat}
      />
    </Box>
  );
};

export default Chatbot;
