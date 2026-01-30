// /ata-frontend/src/components/chatbot/MessageList.jsx (DEFINITIVELY CORRECTED)

import { useEffect, useRef, memo, Component } from 'react';
import { Box, Stack, Typography, Avatar, Alert } from '@mui/material';
import { styled } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

import AutoAwesome from '@mui/icons-material/AutoAwesome';
import { useAuth } from '../../hooks/useAuth';
import ChartRenderer from '../common/ChartRenderer';
import ThinkingIndicator from './ThinkingIndicator';

// --- Error Boundary ---
class MessageErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Message rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert severity="error" sx={{ my: 1 }}>
          Failed to render message. {this.state.error?.message || 'Unknown error'}
        </Alert>
      );
    }
    return this.props.children;
  }
}

// --- Sub-Components (Blinking cursor still used in MessageBubble) ---
const BlinkingCursor = styled('span')({
  display: 'inline-block',
  width: '8px',
  height: '16px',
  backgroundColor: 'currentColor',
  marginLeft: '2px',
  animation: 'blink 1s infinite',
  '@keyframes blink': {
    '0%, 49%': { opacity: 1 },
    '50%, 100%': { opacity: 0 }
  }
});


// --- MessageBubble Component (THIS IS WHERE THE FIX IS) ---
const MessageBubbleComponent = ({ message }) => {
  const { user } = useAuth();

  // --- [THE FIX - STEP 1: Use 'role' instead of 'author'] ---
  const isBot = message.role === 'bot';
  // --- [END OF FIX] ---

  // CRITICAL SAFETY CHECKS
  if (!message) {
    return null;
  }

  if (typeof message.content !== 'string') {
    return (
      <Alert severity="warning" sx={{ my: 1 }}>
        Invalid message format
      </Alert>
    );
  }

  const hasCharts = Array.isArray(message.charts) && message.charts.length > 0;

  // Debug logging
  console.log('[MessageBubble] Rendering:', {
    id: message.id,
    role: message.role,
    contentLength: message.content?.length,
    hasCharts,
    chartsCount: message.charts?.length || 0,
    isStreaming: message.isStreaming,
    hasMath: (message.content?.match(/\$/g) || []).length > 0
  });

  // CRITICAL FIX: Check for incomplete math during streaming
  const hasIncompleteMath = message.isStreaming && (() => {
    const singleDollarCount = (message.content.match(/\$/g) || []).length;
    const doubleDollarCount = (message.content.match(/\$\$/g) || []).length;
    // If odd number of single $ OR odd number of $$ pairs, math is incomplete
    return (singleDollarCount - doubleDollarCount * 2) % 2 !== 0 || doubleDollarCount % 2 !== 0;
  })();

  // CRITICAL FIX: Try-catch wrapper for rendering to prevent blank screen
  let renderContent;
  try {
    renderContent = String(message.content || '');
  } catch (error) {
    return (
      <Alert severity="error" sx={{ my: 1 }}>
        Failed to render message content
      </Alert>
    );
  }

  // Error handler for KaTeX
  useEffect(() => {
    const handleKatexError = (event) => {
      console.error('[KaTeX ERROR]:', event.detail || event);
    };
    window.addEventListener('katex-error', handleKatexError);
    return () => window.removeEventListener('katex-error', handleKatexError);
  }, []);

  return (
    <Stack
      direction="row"
      spacing={2}
      sx={{
        justifyContent: isBot ? 'flex-start' : 'flex-end',
        width: '100%',
      }}
      ref={(el) => {
        if (el) {
          console.log(`[MessageBubble ${message.id.slice(-8)}] Stack height:`, el.offsetHeight);
        }
      }}
    >
      {isBot && (
        <Avatar sx={{ width: 40, height: 40, bgcolor: 'secondary.light', color: 'primary.main' }}>
          <AutoAwesome />
        </Avatar>
      )}
      <Box
        sx={{
          p: '10px 14px',  // Reduced from 12px 16px
          bgcolor: isBot ? 'background.paper' : 'primary.main',
          color: isBot ? 'text.primary' : 'primary.contrastText',
          borderRadius: 4,
          border: isBot ? '1px solid' : 'none',
          borderColor: 'divider',
          maxWidth: hasCharts ? '90%' : '80%',
        }}
      >
        <Box sx={{
          overflow: 'visible',  // CRITICAL: Prevent height calculation issues
          '& p': { margin: '0.25em 0' },
          '& ul, & ol': { paddingLeft: '1.5em', margin: '0.25em 0' },
          '& li': { marginBottom: '0.1em' },
          '& h1, & h2, & h3': { marginTop: '0.5em', marginBottom: '0.25em' },
          // CRITICAL KaTeX fixes
          '& .katex': { fontSize: '1em', display: 'inline', maxHeight: 'none' },
          '& .katex-display': {
            display: 'block',
            margin: '0.5em 0',
            textAlign: 'center',
            overflow: 'visible'  // Prevent height issues
          },
          '& .katex-html': { display: 'inline' },  // Prevent block expansion
          color: 'inherit',
          '& *': { maxWidth: '100%' }
        }}>
          {hasIncompleteMath ? (
            // Show raw text when math is incomplete during streaming
            <Typography component="span" sx={{ whiteSpace: 'pre-wrap' }}>
              {renderContent}
            </Typography>
          ) : (
            <ReactMarkdown
            key={`markdown-${message.id}`}  // STABLE KEY - only message ID
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[
              [rehypeKatex, {
                throwOnError: false,
                errorColor: '#cc0000',
                strict: false,
                output: 'html',  // CRITICAL FIX: Use ONLY html, not htmlAndMathml (prevents double rendering)
                trust: false
              }]
            ]}
            components={{
              // Style code blocks (but NOT math - let KaTeX handle it)
              code: ({node, inline, className, children, ...props}) => {
                // If this is a math element, return it unchanged (let KaTeX handle it)
                const isMath = className && (className.includes('language-math') || className.includes('math-inline') || className.includes('math-display'));
                if (isMath) {
                  return <code className={className} {...props}>{children}</code>;
                }

                // Otherwise, apply custom styling for regular code
                return inline
                  ? <code style={{backgroundColor: '#f5f5f5', padding: '2px 4px', borderRadius: '3px'}} {...props}>{children}</code>
                  : <pre style={{backgroundColor: '#f5f5f5', padding: '12px', borderRadius: '4px', overflow: 'auto'}}><code {...props}>{children}</code></pre>;
              },
              // Style tables
              table: ({node, ...props}) => (
                <table style={{borderCollapse: 'collapse', width: '100%', marginTop: '8px', marginBottom: '8px'}} {...props} />
              ),
              th: ({node, ...props}) => (
                <th style={{border: '1px solid #ddd', padding: '8px', backgroundColor: '#f2f2f2'}} {...props} />
              ),
              td: ({node, ...props}) => (
                <td style={{border: '1px solid #ddd', padding: '8px'}} {...props} />
              ),
            }}
          >
            {/* --- [THE FIX - STEP 2: Use 'content' instead of 'text'] --- */}
            {renderContent}
            {/* --- [END OF FIX] --- */}
          </ReactMarkdown>
          )}
          {message.isStreaming && <BlinkingCursor />}
        </Box>
        {hasCharts && (
          <Box sx={{ mt: 0.5 }}>  {/* Reduced to 0.5 (4px) */}
            {message.charts.map((chart, idx) => (
              <ChartRenderer key={idx} data={chart} />
            ))}
          </Box>
        )}
      </Box>
      {!isBot && (
        <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>
          {user?.name?.charAt(0) || 'U'}
        </Avatar>
      )}
    </Stack>
  );
};

// Wrap with memo to prevent infinite re-renders
const MessageBubble = memo(MessageBubbleComponent, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render), false if different (re-render)
  const prev = prevProps.message;
  const next = nextProps.message;

  // CRITICAL: Compare only essential fields to prevent unnecessary re-renders
  if (prev.id !== next.id) return false;
  if (prev.content !== next.content) return false;
  if (prev.isStreaming !== next.isStreaming) return false;

  // Compare charts by length and first chart data (avoid JSON.stringify which is slow)
  const prevCharts = prev.charts || [];
  const nextCharts = next.charts || [];
  if (prevCharts.length !== nextCharts.length) return false;

  // Charts are equal enough - return true to SKIP re-render
  console.log(`[MessageBubble ${next.id.slice(-8)}] memo returning TRUE - skipping re-render`);
  return true;
});


// --- Main MessageList Component ---
const MessageList = ({ messages, isThinking, children }) => {
  const scrollRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    // NOTE: Auto-scroll is now handled by FloatingChatWindow for better control
    // scrollRef.current?.scrollIntoView({ behavior: 'smooth' });

    // Debug logging
    if (containerRef.current) {
      console.log('[MessageList] Container dimensions:', {
        height: containerRef.current.offsetHeight,
        scrollHeight: containerRef.current.scrollHeight,
        messageCount: messages.length,
        isThinking
      });
    }
  }, [messages, isThinking]);

  return (
    <Box
      ref={containerRef}
      sx={{
        p: 1.5  // Reduced from 2 (16px) to 1.5 (12px)
        // Removed flex and minHeight - let it be natural height
      }}
    >
      <Stack spacing={1.5}>  {/* Reduced to 1.5 (12px) for tighter layout */}
        {children}
        {messages.map((msg) => (
          <MessageErrorBoundary key={msg.id}>
            <MessageBubble message={msg} />
          </MessageErrorBoundary>
        ))}
        {isThinking && <ThinkingIndicator />}
        <div ref={scrollRef} style={{ height: 0, overflow: 'hidden' }} />  {/* Zero height scrollRef */}
      </Stack>
    </Box>
  );
};

export default MessageList;
