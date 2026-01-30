// /ata-frontend/src/components/chatbot/ChatHistoryMenu.jsx

import React from 'react';
import { Menu, MenuItem, Typography, Box, Divider, CircularProgress, Button } from '@mui/material';

const ChatHistoryMenu = ({ anchorEl, open, onClose, sessions, loading, onSelect, onNewChat }) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      sx={{
        zIndex: 10000  // Root menu z-index
      }}
      slotProps={{
        paper: {
          sx: {
            zIndex: 10000,  // Paper z-index
            maxHeight: 400
          }
        }
      }}
      BackdropProps={{
        sx: {
          zIndex: 9999  // Backdrop between floating window and menu
        }
      }}
    >
      <Box sx={{ px: 2, py: 1 }}>
        <Typography variant="subtitle2">Chat History</Typography>
      </Box>
      <Divider />
      <MenuItem onClick={onNewChat}>
        <Button variant="text" size="small">Start New Chat</Button>
      </MenuItem>
      <Divider />
      {loading && (
        <MenuItem>
          <CircularProgress size={18} />
          <Typography sx={{ ml: 1 }} variant="body2">Loading...</Typography>
        </MenuItem>
      )}
      {!loading && sessions.length === 0 && (
        <MenuItem disabled>
          <Typography variant="body2" color="text.secondary">No previous chats</Typography>
        </MenuItem>
      )}
      {!loading && sessions.map((session) => (
        <MenuItem key={session.id} onClick={() => onSelect(session.id)}>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="body2" fontWeight={600}>
              {session.name || 'Untitled Chat'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {new Date(session.created_at).toLocaleString()}
            </Typography>
          </Box>
        </MenuItem>
      ))}
    </Menu>
  );
};

export default ChatHistoryMenu;
