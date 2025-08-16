// /ata-frontend/src/components/chatbot/MessageList.jsx (DEFINITIVELY CORRECTED)

import React, { useEffect, useRef, memo } from 'react';
import { Box, Stack, Typography, Avatar } from '@mui/material';
import { styled } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import SmartToyOutlined from '@mui/icons-material/SmartToyOutlined';
import { useAuth } from '../../hooks/useAuth';

// --- Sub-Components (These are correct and need no changes) ---
const ThinkingIndicator = () => (
  <Stack direction="row" spacing={1.5} alignItems="center">
    <Avatar sx={{ width: 40, height: 40, bgcolor: 'secondary.light', color: 'primary.main' }}><SmartToyOutlined /></Avatar>
    <Box sx={{ p: '12px 16px', bgcolor: 'background.paper', borderRadius: 4, display: 'flex', gap: '6px', border: '1px solid', borderColor: 'divider' }}>
      <TypingDot delay="0s" />
      <TypingDot delay="0.2s" />
      <TypingDot delay="0.4s" />
    </Box>
  </Stack>
);

const TypingDot = styled('div')(({ theme, delay }) => ({ /* ...styles... */ }));
const BlinkingCursor = styled('span')({ /* ...styles... */ });


// --- MessageBubble Component (THIS IS WHERE THE FIX IS) ---
const MessageBubble = memo(({ message }) => {
  const { user } = useAuth();
  
  // --- [THE FIX - STEP 1: Use 'role' instead of 'author'] ---
  const isBot = message.role === 'bot';
  // --- [END OF FIX] ---

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        justifyContent: isBot ? 'flex-start' : 'flex-end',
        width: '100%',
      }}
    >
      {isBot && (
        <Avatar sx={{ width: 40, height: 40, bgcolor: 'secondary.light', color: 'primary.main' }}>
          <SmartToyOutlined />
        </Avatar>
      )}
      <Box
        sx={{
          p: '12px 16px',
          bgcolor: isBot ? 'background.paper' : 'primary.main',
          color: isBot ? 'text.primary' : 'primary.contrastText',
          borderRadius: 4,
          border: isBot ? '1px solid' : 'none',
          borderColor: 'divider',
          maxWidth: '80%',
        }}
      >
        <Box className="markdown-body">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                return !inline && match ? (
                  <SyntaxHighlighter style={vscDarkPlus} language={match[1]} PreTag="div" {...props}>
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>{children}</code>
                );
              },
              p: ({node, ...props}) => <Typography variant="body1" component="p" {...props} />,
              li: ({node, ...props}) => <li><Typography variant="body1" component="span" {...props} /></li>,
            }}
          >
            {/* --- [THE FIX - STEP 2: Use 'content' instead of 'text'] --- */}
            {message.content}
            {/* --- [END OF FIX] --- */}
          </ReactMarkdown>
          {message.isStreaming && <BlinkingCursor />}
        </Box>
      </Box>
      {!isBot && (
        <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
          {user?.name?.charAt(0) || 'U'}
        </Avatar>
      )}
    </Stack>
  );
});


// --- Main MessageList Component (This is correct and needs no changes) ---
const MessageList = ({ messages, isThinking, children }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
      <Stack spacing={3}>
        {children}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isThinking && <ThinkingIndicator />}
        <div ref={scrollRef} />
      </Stack>
    </Box>
  );
};

export default MessageList;