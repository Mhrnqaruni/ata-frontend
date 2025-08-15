// /ata-frontend/src/components/chatbot/ChatInput.jsx

import React, { useState, useRef } from 'react';
import { Box, TextField, IconButton, InputAdornment, Stack, Button } from '@mui/material';

import SendOutlined from '@mui/icons-material/SendOutlined';
import AttachFileOutlined from '@mui/icons-material/AttachFileOutlined';
import StopCircleOutlined from '@mui/icons-material/StopCircleOutlined';

/**
 * A controlled component that provides a text input, file attachment,
 * and submit button for the chat.
 *
 * @param {object} props
 * @param {function} props.onSendMessage - Callback to send a message.
 * @param {boolean} props.disabled - Whether the input and button should be disabled.
 * @param {boolean} props.isResponding - Whether the bot is currently streaming a response.
 * @param {function} props.onStopGeneration - Callback to stop the bot's streaming response.
 * @param {function} props.onFileUpload - Callback to handle file selection.
 */
const ChatInput = ({ onSendMessage, disabled, isResponding, onStopGeneration, onFileUpload }) => {
  const [text, setText] = useState('');
  const fileInputRef = useRef(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedText = text.trim();
    if (trimmedText && !disabled) {
      onSendMessage(trimmedText);
      setText('');
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  const handleFileIconClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      onFileUpload(file);
    }
    // Reset the input value to allow uploading the same file again
    event.target.value = null;
  };

  return (
    <Box sx={{ p: 2, flexShrink: 0, bgcolor: 'background.paper', borderTop: 1, borderColor: 'divider' }}>
      <form onSubmit={handleSubmit} noValidate>
        <Stack spacing={1}>
          {/* Conditionally render the "Stop Generating" button */}
          {isResponding && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<StopCircleOutlined />}
              onClick={onStopGeneration}
              sx={{ alignSelf: 'center' }}
            >
              Stop Generating
            </Button>
          )}
          <TextField
            fullWidth
            multiline
            maxRows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={disabled ? "ATA is thinking..." : "Ask a question, or attach a file..."}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <IconButton onClick={handleFileIconClick} disabled={disabled} aria-label="attach file">
                    <AttachFileOutlined />
                  </IconButton>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    accept=".pdf,.docx,.png,.jpeg,.jpg"
                  />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end" sx={{ alignSelf: 'flex-end', mb: 1 }}>
                  <IconButton
                    type="submit"
                    disabled={!text.trim() || disabled}
                    color="primary"
                    aria-label="send message"
                  >
                    <SendOutlined />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Stack>
      </form>
    </Box>
  );
};

export default ChatInput;