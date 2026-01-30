// /ata-frontend/src/components/common/ContextualChat.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Alert,
  LinearProgress
} from '@mui/material';
import { v4 as uuidv4 } from 'uuid';
import ChatIcon from '@mui/icons-material/Chat';
import BarChartIcon from '@mui/icons-material/BarChart';

import MessageList from '../chatbot/MessageList';
import ChatInput from '../chatbot/ChatInput';
import useChatWebSocket from '../../hooks/useChatWebSocket';
import chatService from '../../services/chatService';
import { useSnackbar } from '../../hooks/useSnackbar';
import ChartRenderer from './ChartRenderer';

/**
 * ContextualChat - A context-aware chat component that can be embedded in any page
 *
 * @param {object} props
 * @param {string} props.pageContext - "general" | "class" | "student" | "quiz_session" | "quiz_sp_session"
 * @param {string} props.entityId - ID of the entity (class_id, student_id, session_id, etc.)
 * @param {string} props.entityType - "class" | "student" | "quiz" | "quiz_sp"
 * @param {string} props.entityName - Display name ("Math 101", "John Doe", "Midterm Quiz")
 */
const ContextualChat = ({
  pageContext = "general",
  entityId = null,
  entityType = null,
  entityName = null
}) => {
  const navigate = useNavigate();
  const { showSnackbar } = useSnackbar();

  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [stage, setStage] = useState(null); // "planning" | "querying" | "analyzing" | "synthesizing"
  const [chartData, setChartData] = useState(null);

  // WebSocket hook
  const { isThinking, isResponding, connect, sendMessage } = useChatWebSocket(setMessages);

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage = {
      id: `msg_welcome_${uuidv4()}`,
      role: 'bot',
      content: entityName
        ? `Hello! I'm here to help you analyze data for **${entityName}**. What would you like to know?`
        : "Hello! I'm My Smart Teach, your AI assistant. How can I help you with your data today?"
    };
    setMessages([welcomeMessage]);
  }, [entityName]);

  // Handle sending first message (creates session)
  const handleSendFirstMessage = async (messageText, fileId = null) => {
    setIsCreatingSession(true);

    try {
      // Create context object
      const context = {
        pageContext,
        entityType,
        entityId,
        entityName
      };

      // Create new session with context
      const { sessionId: newSessionId } = await chatService.createNewChatSession(
        messageText,
        fileId,
        context
      );

      setSessionId(newSessionId);

      // Add user message to UI optimistically
      const userMessage = {
        id: `msg_user_${uuidv4()}`,
        role: 'user',
        content: messageText,
        file_id: fileId
      };
      setMessages(prev => [...prev, userMessage]);

      // Connect WebSocket and send message
      connect(newSessionId);
      sendMessage(messageText, fileId);

    } catch (error) {
      showSnackbar(error.message, 'error');
    } finally {
      setIsCreatingSession(false);
    }
  };

  // Handle sending subsequent messages
  const handleSendMessage = async (messageText, fileId = null) => {
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
  };

  // WebSocket event listener for stage updates and charts
  useEffect(() => {
    if (!sessionId || !window.currentChatWebSocket) return;

    const handleStageUpdate = (event) => {
      const data = event.detail;
      setStage(data.stage);
    };

    const handleChartData = (event) => {
      const data = event.detail;
      setChartData(data.data);
    };

    window.currentChatWebSocket.addEventListener('stage_update', handleStageUpdate);
    window.currentChatWebSocket.addEventListener('chart_data', handleChartData);

    return () => {
      if (window.currentChatWebSocket) {
        window.currentChatWebSocket.removeEventListener('stage_update', handleStageUpdate);
        window.currentChatWebSocket.removeEventListener('chart_data', handleChartData);
      }
    };
  }, [sessionId]);

  const isInputDisabled = isThinking || isResponding || isCreatingSession;

  return (
    <Paper elevation={2} sx={{ p: 3, height: '600px', display: 'flex', flexDirection: 'column' }}>
      {/* Context indicator */}
      {entityName && (
        <Box sx={{ mb: 2 }}>
          <Chip
            icon={<ChatIcon />}
            label={`Analyzing: ${entityName}`}
            color="primary"
            variant="outlined"
            size="small"
          />
        </Box>
      )}

      {/* Stage indicator */}
      {stage && (
        <Box sx={{ mb: 2 }}>
          <Alert severity="info" icon={<BarChartIcon />}>
            <Typography variant="body2">
              {stage === 'planning' && '🤔 Analyzing your question and planning the analysis...'}
              {stage === 'querying' && '🔍 Querying the database...'}
              {stage === 'analyzing' && '📊 Analyzing the data...'}
              {stage === 'synthesizing' && '✍️ Preparing your answer...'}
            </Typography>
            <LinearProgress sx={{ mt: 1 }} />
          </Alert>
        </Box>
      )}

      {/* Messages */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', mb: 2 }}>
        <MessageList messages={messages} isThinking={isThinking} />

        {/* Chart display */}
        {chartData && (
          <Box sx={{ mt: 2 }}>
            <ChartRenderer data={chartData} />
          </Box>
        )}
      </Box>

      {/* Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isInputDisabled}
        isResponding={isResponding}
        onStopGeneration={() => {}}
        onFileUpload={() => {}}
      />
    </Paper>
  );
};

export default ContextualChat;
