// /ata-frontend/src/components/chatbot/MessageList.jsx

import React, { useEffect, useRef, memo } from 'react'; // Import memo
import { Box, Stack, Typography, Avatar } from '@mui/material';
import { styled } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

import SmartToyOutlined from '@mui/icons-material/SmartToyOutlined';
import { useAuth } from '../../hooks/useAuth';

// --- Sub-Component: The visual "thinking" indicator ---
const ThinkingIndicator = () => (
  <Stack direction="row" spacing={1.5} alignItems="center">
    <Avatar sx={{ width: 40, height: 40, bgcolor: 'secondary.light', color: 'primary.main' }}>
      <SmartToyOutlined />
    </Avatar>
    <Box sx={{ p: '12px 16px', bgcolor: 'background.paper', borderRadius: 4, display: 'flex', gap: '6px', border: '1px solid', borderColor: 'divider' }}>
      <TypingDot delay="0s" />
      <TypingDot delay="0.2s" />
      <TypingDot delay="0.4s" />
    </Box>
  </Stack>
);

const TypingDot = styled('div')(({ theme, delay }) => ({
  backgroundColor: theme.palette.text.secondary,
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  animation: 'pulse 1.2s infinite ease-in-out',
  animationDelay: delay,
  '@keyframes pulse': {
    '0%, 80%, 100%': { transform: 'scale(0)' },
    '40%': { transform: 'scale(1.0)' },
  },
}));

// --- Sub-Component: The Blinking Cursor for streaming text ---
const BlinkingCursor = styled('span')({
  display: 'inline-block',
  width: '2px',
  height: '1em',
  backgroundColor: 'currentColor',
  marginLeft: '4px',
  verticalAlign: 'bottom',
  animation: 'blink 1s step-end infinite',
  '@keyframes blink': {
    'from, to': { opacity: 1 },
    '50%': { opacity: 0 },
  },
});

// --- [PERFORMANCE FIX] ---
// The entire MessageBubble component is wrapped in React.memo.
// It will now only re-render if its own `message` prop object changes.
const MessageBubble = memo(({ message }) => {
  const { user } = useAuth();
  const isBot = message.author === 'bot';

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
                  <SyntaxHighlighter
                    style={vscDarkPlus}
                    language={match[1]}
                    PreTag="div"
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </SyntaxHighlighter>
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              p: ({node, ...props}) => <Typography variant="body1" component="p" {...props} />,
              li: ({node, ...props}) => <li><Typography variant="body1" component="span" {...props} /></li>,
            }}
          >
            {message.text}
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
// --- [END OF FIX] ---

/**
 * A "dumb" presentational component that renders the list of chat messages,
 * a thinking indicator, and handles auto-scrolling.
 */
const MessageList = ({ messages, isThinking, children }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
      <Stack spacing={3}>
        {children}

        {/* --- [LOGICAL FLAW FIX] --- */}
        {/* The key is now the stable, unique msg.id */}
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {/* --- [END OF FIX] --- */}
        
        {isThinking && <ThinkingIndicator />}

        <div ref={scrollRef} />
      </Stack>
    </Box>
  );
};

export default MessageList;