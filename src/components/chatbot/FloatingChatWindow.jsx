// /ata-frontend/src/components/chatbot/FloatingChatWindow.jsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Tooltip,
  Alert,
  LinearProgress,
  Chip,
  CircularProgress,
  Button
} from '@mui/material';
import {
  Close as CloseIcon,
  Minimize as MinimizeIcon,
  OpenInFull as MaximizeIcon,
  CropSquare as RestoreIcon,
  History as HistoryIcon,
  Download as DownloadIcon,
  AutoAwesome as ChatIcon,
  BarChart as BarChartIcon
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';

import MessageList from './MessageList';
import ChatInput from './ChatInput';
import ChatWelcome from './ChatWelcome';
import ChatHistoryMenu from './ChatHistoryMenu';
import useChatWebSocket from '../../hooks/useChatWebSocket';
import chatService from '../../services/chatService';
import { useSnackbar } from '../../hooks/useSnackbar';

/**
 * FloatingChatWindow - Professional floating chat interface for SP Analytics
 *
 * Features:
 * - 3 window states: normal, minimized, maximized
 * - Inline charts in messages
 * - Chat history per entity
 * - DOCX report export
 */
const FloatingChatWindow = ({
  open,
  onClose,
  pageContext,
  entityId,
  entityType,
  entityName,
  autoSendMessage = null,  // NEW: Message to auto-send
  onMessageSent = null  // NEW: Callback after message is sent
}) => {
  const { showSnackbar } = useSnackbar();

  // Window state
  const [windowState, setWindowState] = useState('normal'); // 'normal' | 'minimized' | 'maximized'

  // Chat state
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [stage, setStage] = useState(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // History menu
  const [historyAnchor, setHistoryAnchor] = useState(null);
  const [historySessions, setHistorySessions] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Smart scroll tracking
  const messagesBoxRef = useRef(null);
  const userHasScrolledUp = useRef(false);
  const lastMessageCount = useRef(0);

  // WebSocket hook with inline charts enabled
  const { isThinking, isResponding, connect, sendMessage } = useChatWebSocket(
    setMessages,
    { inlineCharts: true }
  );

  // Listen for stage updates via global event bus
  useEffect(() => {
    if (!sessionId || !window.currentChatWebSocket) return;

    const handleStageUpdate = (event) => {
      setStage(event.detail.stage);
    };

    window.currentChatWebSocket.addEventListener('stage_update', handleStageUpdate);

    return () => {
      if (window.currentChatWebSocket) {
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

    // If user is more than 100px from bottom, they've scrolled up intentionally
    userHasScrolledUp.current = distanceFromBottom > 100;

    console.log('[FloatingChatWindow] Scroll detection:', {
      distanceFromBottom,
      userHasScrolledUp: userHasScrolledUp.current
    });
  }, []);

  // Smart scroll: auto-scroll to bottom only when appropriate
  useEffect(() => {
    if (!messagesBoxRef.current) return;

    const isNewMessage = messages.length !== lastMessageCount.current;
    lastMessageCount.current = messages.length;

    // Only auto-scroll if:
    // 1. A NEW message was added (not just streaming update), OR
    // 2. User is already at the bottom (hasn't scrolled up)
    if (isNewMessage) {
      // New message - always scroll (reset user scroll state)
      userHasScrolledUp.current = false;
      messagesBoxRef.current.scrollTo({
        top: messagesBoxRef.current.scrollHeight,
        behavior: 'smooth'
      });
      console.log('[FloatingChatWindow] New message - scrolling to bottom');
    } else if (!userHasScrolledUp.current && (isResponding || isThinking)) {
      // Streaming update - only scroll if user is at bottom
      messagesBoxRef.current.scrollTo({
        top: messagesBoxRef.current.scrollHeight,
        behavior: 'smooth'
      });
      console.log('[FloatingChatWindow] Streaming update - auto-scrolling');
    } else {
      console.log('[FloatingChatWindow] User scrolled up - NOT auto-scrolling');
    }
  }, [messages, isResponding, isThinking]);

  // Handle sending first message (creates session)
  const handleSendFirstMessage = useCallback(async (messageText, fileId = null) => {
    // CRITICAL FIX: Add user message IMMEDIATELY (before session creation)
    const userMessage = {
      id: `msg_user_${uuidv4()}`,
      role: 'user',
      content: messageText,
      file_id: fileId
    };
    setMessages(prev => [...prev, userMessage]);

    // Now start session creation and show thinking
    setIsCreatingSession(true);

    try {
      // Create context object
      const context = {
        pageContext,
        entityType,
        entityId,
        entityName
      };

      // DEBUG: Log context to verify values
      console.log('[FloatingChatWindow] Creating session with context:', context);
      console.log('[FloatingChatWindow] Props:', { pageContext, entityType, entityId, entityName });

      // Create new session
      const { sessionId: newSessionId } = await chatService.createNewChatSession(
        messageText,
        fileId,
        context
      );

      setSessionId(newSessionId);

      // Connect WebSocket and send
      connect(newSessionId);
      sendMessage(messageText, fileId);

      // CRITICAL FIX: Keep isCreatingSession true until WebSocket starts responding
      // The WebSocket hook will set isThinking=true when stream_start arrives
      // We delay clearing isCreatingSession to bridge the gap
      setTimeout(() => {
        setIsCreatingSession(false);
      }, 1000);  // 1 second should be enough for WebSocket to connect and start responding

    } catch (error) {
      showSnackbar(error.message, 'error');
      setIsCreatingSession(false);  // Clear immediately on error
    }
  }, [pageContext, entityType, entityId, entityName, connect, sendMessage, showSnackbar]);

  // Handle sending subsequent messages
  const handleSendMessage = useCallback(async (messageText, fileId = null) => {
    if (!sessionId) {
      // First message
      await handleSendFirstMessage(messageText, fileId);
    } else {
      // Subsequent messages
      const userMessage = {
        id: `msg_user_${uuidv4()}`,
        role: 'user',
        content: messageText,
        file_id: fileId
      };
      setMessages(prev => [...prev, userMessage]);
      sendMessage(messageText, fileId);
    }
  }, [sessionId, handleSendFirstMessage, sendMessage]);

  // Open history menu
  const handleOpenHistory = useCallback(async (event) => {
    setHistoryAnchor(event.currentTarget);
    setHistoryLoading(true);

    try {
      const sessions = await chatService.getChatSessionsByEntity(entityType, entityId);
      setHistorySessions(sessions);
    } catch (error) {
      showSnackbar(error.message, 'error');
    } finally {
      setHistoryLoading(false);
    }
  }, [entityType, entityId, showSnackbar]);

  // Close history menu
  const handleCloseHistory = useCallback(() => {
    setHistoryAnchor(null);
  }, []);

  // Load previous chat
  const handleSelectHistory = useCallback(async (selectedSessionId) => {
    handleCloseHistory();

    try {
      const sessionData = await chatService.getChatSessionDetails(selectedSessionId);

      // Map history to messages with charts
      const formattedMessages = sessionData.history.map(msg => ({
        id: msg.id || `msg_${uuidv4()}`,
        role: msg.role,
        content: msg.content,
        charts: msg.metadata?.charts || []
      }));

      setMessages(formattedMessages);
      setSessionId(selectedSessionId);
      connect(selectedSessionId);

      showSnackbar('Chat history loaded', 'success');
    } catch (error) {
      showSnackbar(error.message, 'error');
    }
  }, [connect, handleCloseHistory, showSnackbar]);

  // Start new chat
  const handleNewChat = useCallback(() => {
    handleCloseHistory();
    setSessionId(null);
    setStage(null);
    const welcomeMessage = {
      id: `msg_welcome_${uuidv4()}`,
      role: 'bot',
      content: entityName
        ? `Hello! I'm here to help you analyze **${entityName}**. What would you like to know?`
        : 'Hello! How can I help you with your analytics today?'
    };
    setMessages([welcomeMessage]);
  }, [entityName, handleCloseHistory]);

  // Auto-send message when provided (can trigger multiple times in same session)
  useEffect(() => {
    // Only trigger if:
    // 1. Window is open
    // 2. autoSendMessage is provided (not null/empty)
    if (open && autoSendMessage) {
      console.log('[FloatingChatWindow] Auto-sending message:', autoSendMessage);

      // Small delay to ensure UI is ready
      const timer = setTimeout(() => {
        // Use handleSendMessage which works for both first and subsequent messages
        handleSendMessage(autoSendMessage, null);

        // Notify parent that message was sent so it can clear the autoSendMessage
        if (onMessageSent) {
          onMessageSent();
        }
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [open, autoSendMessage, handleSendMessage, onMessageSent]);

  // Download report
  const handleDownloadReport = useCallback(async () => {
    if (!sessionId) {
      showSnackbar('No chat session to export', 'warning');
      return;
    }

    setIsDownloading(true);
    try {
      await chatService.downloadChatReport(sessionId, `${entityName || 'chat'}_analytics_report.docx`);
      showSnackbar('Report downloaded successfully', 'success');
    } catch (error) {
      showSnackbar(error.message, 'error');
    } finally {
      setIsDownloading(false);
    }
  }, [sessionId, entityName, showSnackbar]);

  // Toggle window state
  const handleMinimize = () => setWindowState('minimized');
  const handleMaximize = () => setWindowState('maximized');
  const handleRestore = () => setWindowState('normal');

  // Window sizing styles
  const windowStyles = useMemo(() => {
    const baseStyles = {
      position: 'fixed',
      zIndex: 9999,
      boxShadow: windowState === 'minimized'
        ? '0 4px 12px rgba(0,0,0,0.15)'
        : '0 12px 48px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      borderRadius: '12px',  // ALWAYS ROUNDED
      transformOrigin: 'bottom right'  // ANIMATE FROM BOTTOM-RIGHT
    };

    if (windowState === 'minimized') {
      return {
        ...baseStyles,
        width: '280px',
        height: '56px',
        right: '20px',
        bottom: '20px',
        opacity: 0.95
      };
    } else if (windowState === 'maximized') {
      return {
        ...baseStyles,
        width: '95vw',
        height: '95vh',
        right: '2.5vw',
        bottom: '2.5vh'
      };
    } else {
      // normal
      return {
        ...baseStyles,
        width: '480px',
        height: '70vh',
        right: '20px',
        bottom: '20px'
      };
    }
  }, [windowState]);

  if (!open) return null;

  const isInputDisabled = isThinking || isResponding || isCreatingSession;
  const showBody = windowState !== 'minimized';
  // Combine thinking states for MessageList
  const showThinking = isThinking || isCreatingSession;

  return (
    <Paper
      elevation={10}
      sx={{ ...windowStyles, overflow: 'hidden' }}
      ref={(el) => {
        if (el) {
          console.log('[FloatingChatWindow] Paper dimensions:', {
            width: el.offsetWidth,
            height: el.offsetHeight,
            windowState,
            messagesCount: messages.length
          });
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',  // WHITE, not purple!
          cursor: windowState === 'minimized' ? 'pointer' : 'default'
        }}
        onClick={windowState === 'minimized' ? handleRestore : undefined}
      >
        {/* LEFT SIDE: History button + Title */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {windowState !== 'minimized' && (
            <Tooltip title="Chat History">
              <IconButton size="small" onClick={handleOpenHistory}>
                <HistoryIcon />
              </IconButton>
            </Tooltip>
          )}
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            Analytics with AI
          </Typography>
          {stage && windowState !== 'minimized' && (
            <Chip size="small" label={stage} color="info" variant="outlined" />
          )}
        </Box>

        {/* RIGHT SIDE: Download + Window controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          {/* Download button - text when maximized, icon when normal */}
          {windowState !== 'minimized' && (
            windowState === 'maximized' ? (
              <Button
                size="small"
                variant="outlined"
                startIcon={isDownloading ? <CircularProgress size={16} /> : <DownloadIcon />}
                onClick={handleDownloadReport}
                disabled={!sessionId || isDownloading}
                sx={{ mr: 0.5 }}
              >
                {isDownloading ? 'Generating...' : 'Download as Report'}
              </Button>
            ) : (
              <Tooltip title={!sessionId ? "Start a conversation first" : "Download Report"}>
                <span>
                  <IconButton
                    size="small"
                    onClick={handleDownloadReport}
                    disabled={!sessionId || isDownloading}
                    sx={{
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: '4px'
                    }}
                  >
                    {isDownloading ? <CircularProgress size={20} /> : <DownloadIcon />}
                  </IconButton>
                </span>
              </Tooltip>
            )
          )}

          {/* Minimize */}
          <Tooltip title="Minimize">
            <IconButton size="small" onClick={handleMinimize}>
              <MinimizeIcon />
            </IconButton>
          </Tooltip>

          {/* Restore button (only show when minimized) */}
          {windowState === 'minimized' && (
            <IconButton size="small" onClick={handleRestore}>
              <RestoreIcon />
            </IconButton>
          )}

          {/* Maximize/Restore toggle (only when not minimized) */}
          {windowState !== 'minimized' && (
            windowState === 'maximized' ? (
              <Tooltip title="Restore">
                <IconButton size="small" onClick={handleRestore}>
                  <RestoreIcon />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title="Maximize">
                <IconButton size="small" onClick={handleMaximize}>
                  <MaximizeIcon />
                </IconButton>
              </Tooltip>
            )
          )}

          {/* Close */}
          <Tooltip title="Close">
            <IconButton size="small" onClick={() => { setWindowState('normal'); onClose?.(); }}>
              <CloseIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Body (hidden when minimized) */}
      {showBody && (
        <>
          {/* Messages */}
          <Box
            ref={messagesBoxRef}
            onScroll={handleMessagesScroll}
            sx={{
              flex: '1 1 0',  // Allow grow and shrink, but start from 0 basis
              minHeight: 0,    // Critical: prevent flex item from forcing minimum content size
              overflow: 'auto',
              bgcolor: 'background.default',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {messages.length === 0 ? (
              <ChatWelcome onSend={handleSendMessage} entityName={entityName} />
            ) : (
              <MessageList messages={messages} isThinking={showThinking} />
            )}
          </Box>

          {/* Input */}
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isInputDisabled}
            isResponding={isResponding}
            onStopGeneration={() => {}}
          />
        </>
      )}

      {/* History Menu */}
      <ChatHistoryMenu
        anchorEl={historyAnchor}
        open={Boolean(historyAnchor)}
        onClose={handleCloseHistory}
        sessions={historySessions}
        loading={historyLoading}
        onSelect={handleSelectHistory}
        onNewChat={handleNewChat}
      />
    </Paper>
  );
};

export default FloatingChatWindow;
