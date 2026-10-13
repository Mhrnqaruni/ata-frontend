// /src/components/tools/OutputPanel.jsx

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// MUI Component Imports (with Table components added)
import {
  Card, CardContent, Box, Typography, Button, IconButton, Tooltip,
  Divider, Stack, Skeleton, Alert, AlertTitle, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from '@mui/material';

// MUI Icon Imports
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import CheckOutlined from '@mui/icons-material/CheckOutlined';
import RestartAltOutlined from '@mui/icons-material/RestartAltOutlined';
import SaveOutlined from '@mui/icons-material/SaveOutlined';
import CloudDoneOutlined from '@mui/icons-material/CloudDoneOutlined';

// Internal State Component for when the panel is empty
const EmptyState = () => (
    <div className="mst-output-empty">
      <span aria-hidden="true" className="mst-empty-icon" data-ai="true"><AutoAwesomeOutlined /></span>
      <h2 className="mst-empty-title">Your result will appear here</h2>
      <p className="mst-empty-text">Choose your settings, then press Generate.</p>
    </div>
);

// While the AI works: a moving gradient bar along the card's top edge and the shape of what's coming
const LoadingState = () => (
    <div className="mst-output-loading" aria-busy="true" aria-live="polite">
        <div className="mst-ai-bar mst-output-bar" />
        <Box sx={{ p: 3 }}>
            <span className="mst-visually-hidden">Generating…</span>
            <Skeleton variant="rounded" width="40%" height={24} sx={{ mb: 1.5 }} />
            <Skeleton variant="rounded" width="22%" height={16} sx={{ mb: 3 }} />
            <Skeleton variant="rounded" height={72} sx={{ mb: 1.5 }} />
            <Skeleton variant="rounded" height={72} sx={{ mb: 1.5 }} />
            <Skeleton variant="rounded" height={72} />
        </Box>
    </div>
);

// Internal State Component for when an error has occurred
const ErrorState = ({ error }) => (
    <Box sx={{ p: 3 }}>
      <Alert severity="error">
        <AlertTitle>Generation failed</AlertTitle>
        {error || 'An unknown error occurred.'}
      </Alert>
    </Box>
);

/**
 * A state-aware panel for displaying AI-generated content.
 * UPGRADED to correctly render themed Markdown tables.
 */
const OutputPanel = ({ isLoading, error, generatedContent, onClear, onSave, isSaving, isSaved }) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [generatedContent]);

  const handleCopy = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderContent = () => {
    if (isLoading) return <LoadingState />;
    if (error) return <ErrorState error={error} />;
    if (!generatedContent) return <EmptyState />;
    
    // Success State: Display the content and action buttons
    return (
      <>
        {/* Header with Title and Action Buttons */}
        <Box className="mst-card-head" sx={{ flexShrink: 0 }}>
          <Typography component="h2" variant="h4">Result</Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            
            <Button
              variant={isSaved ? "contained" : "outlined"}
              size="small"
              color={isSaved ? "success" : "primary"}
              startIcon={
                isSaving ? <CircularProgress size={16} color="inherit" />
                : isSaved ? <CloudDoneOutlined />
                : <SaveOutlined />
              }
              onClick={onSave}
              disabled={isSaving || isSaved}
            >
              {isSaving ? 'Saving…' : isSaved ? 'Saved' : 'Save'}
            </Button>

            <Button
              variant="outlined"
              size="small"
              startIcon={copied ? <CheckOutlined /> : <ContentCopyOutlined />}
              onClick={handleCopy}
              color={copied ? 'success' : 'primary'}
              sx={{ minWidth: '90px' }}
              disabled={isLoading || isSaving}
            >
              {copied ? 'Copied!' : 'Copy'}
            </Button>
            
            <Tooltip title="Clear and start over">
              <span>
                <IconButton
                  onClick={onClear}
                  aria-label="clear output"
                  disabled={isLoading || isSaving}
                >
                  <RestartAltOutlined />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Box>
        <Divider />

        {/* Content Area with Upgraded Markdown Rendering */}
        <CardContent sx={{ flexGrow: 1, overflowY: 'auto' }}>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              // Text and Header overrides
              p: ({node, ...props}) => <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }} {...props} />,
              strong: ({node, ...props}) => <Typography component="span" sx={{ fontWeight: 600 }} {...props} />,
              li: ({node, ...props}) => <li><Typography variant="body1" component="span" sx={{ whiteSpace: 'pre-wrap' }} {...props} /></li>,
              h1: ({node, ...props}) => <Typography variant="h1" gutterBottom {...props} />,
              h2: ({node, ...props}) => <Typography variant="h2" gutterBottom {...props} />,
              h3: ({node, ...props}) => <Typography variant="h3" gutterBottom {...props} />,
              h4: ({node, ...props}) => <Typography variant="h4" gutterBottom {...props} />,
              h5: ({node, ...props}) => <Typography variant="h5" gutterBottom {...props} />,
              h6: ({node, ...props}) => <Typography variant="h6" gutterBottom {...props} />,

              // --- [CRITICAL FIX] Overrides for Table Elements ---
              table: ({node, ...props}) => <TableContainer component={Paper} variant="outlined" sx={{ my: 2 }}><Table {...props} /></TableContainer>,
              thead: ({node, ...props}) => <TableHead sx={{ bgcolor: 'action.hover' }} {...props} />,
              tbody: ({node, ...props}) => <TableBody {...props} />,
              tr: ({node, ...props}) => <TableRow {...props} />,
              th: ({node, ...props}) => <TableCell sx={{ fontWeight: 600 }} {...props} />,
              td: ({node, ...props}) => <TableCell {...props} />,
            }}
          >
            {generatedContent}
          </ReactMarkdown>
        </CardContent>
      </>
    );
  };

  return (
    <Card className="mst-rim mst-output" sx={{ display: 'flex', flexDirection: 'column' }}>
      {renderContent()}
    </Card>
  );
};

export default OutputPanel;