// /ata-frontend/src/components/chatbot/ChatHistoryPanel.jsx

import React, { useState } from 'react';
import { Box, List, ListItem, ListItemButton, ListItemText, Typography, Button, CircularProgress, IconButton, Menu, MenuItem, Drawer, useTheme } from '@mui/material';
import AddCommentOutlined from '@mui/icons-material/AddCommentOutlined';
import MoreVertIcon from '@mui/icons-material/MoreVert';

// A new sub-component for a single history item with its menu
const HistoryItem = ({ session, active, onSelect, onDelete }) => {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);

    const handleMenuClick = (event) => {
        event.stopPropagation(); // Prevent the main button click
        setAnchorEl(event.currentTarget);
    };
    const handleMenuClose = () => {
        setAnchorEl(null);
    };
    const handleDelete = () => {
        onDelete(session.id);
        handleMenuClose();
    };

    return (
        <ListItem disablePadding>
            <ListItemButton selected={active} onClick={() => onSelect(session.id)}>
                <ListItemText
                    primary={session.name}
                    primaryTypographyProps={{ noWrap: true, variant: 'body2' }}
                    secondary={new Date(session.created_at).toLocaleDateString()}
                />
                <IconButton
                    size="small"
                    aria-label={`options for chat ${session.name}`}
                    onClick={handleMenuClick}
                >
                    <MoreVertIcon fontSize="inherit" />
                </IconButton>
            </ListItemButton>
            <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
                <MenuItem onClick={handleDelete} sx={{color: 'error.main'}}>Delete Chat</MenuItem>
            </Menu>
        </ListItem>
    );
};

const ChatHistoryPanel = ({
  sessions,
  activeSessionId,
  onSessionSelect,
  onNewChat,
  onDeleteSession,
  isLoading,
  mobileOpen, // New prop for mobile drawer state
  onMobileClose, // New prop for closing mobile drawer
}) => {
  const theme = useTheme();
  const drawerWidth = 280;

  // --- [THE REFACTOR IS HERE: REUSABLE CONTENT] ---
  // Define the content once, so we can render it in both the mobile drawer and desktop panel.
  const historyContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Button fullWidth variant="outlined" startIcon={<AddCommentOutlined />} onClick={onNewChat}>
          New Chat
        </Button>
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: 'auto' }}>
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : (
          <List>
            {sessions.map((session) => (
              <HistoryItem
                key={session.id}
                session={session}
                active={session.id === activeSessionId}
                onSelect={(sessionId) => {
                    onSessionSelect(sessionId);
                    onMobileClose(); // Also close drawer on selection
                }}
                onDelete={onDeleteSession}
              />
            ))}
          </List>
        )}
      </Box>
    </Box>
  );
  // --- [END OF REFACTOR] ---

  return (
    <Box
      component="nav"
      sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
    >
      {/* --- MOBILE DRAWER --- */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onMobileClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {historyContent}
      </Drawer>

      {/* --- DESKTOP PANEL --- */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          height: '100%',
          width: drawerWidth,
          borderRight: 1,
          borderColor: 'divider',
        }}
      >
        {historyContent}
      </Box>
    </Box>
  );
};

export default ChatHistoryPanel;