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
    <Box sx={{ textAlign: 'center', p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <AutoAwesomeOutlined sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
      <Typography variant="h3" gutterBottom>Content will appear here</Typography>
      <Typography color="text.secondary">Configure your settings on the left and click 'Generate' to get started.</Typography>
    </Box>
);

// Internal State Component for when the content is loading
const LoadingState = () => (
    <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width="40%" sx={{ fontSize: '1.25rem' }} />
        <Skeleton variant="text" width="20%" sx={{ fontSize: '1rem', mb: 2 }} />
        <Divider />
        <Skeleton variant="text" sx={{ mt: 2 }} />
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" />
        <Skeleton variant="text" width="90%" />
        <Skeleton variant="text" width="75%" />
    </Box>
);

// Internal State Component for when an error has occurred
const ErrorState = ({ error }) => (
    <Box sx={{ p: 3, height: '100%' }}>
      <Alert severity="error" sx={{height: '100%'}}>
        <AlertTitle>Generation Failed</AlertTitle>
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
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <Typography variant="h4">Generated Output</Typography>
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
              {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save'}
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
              strong: ({node, ...props}) => <Typography component="span" sx={{ fontWeight: 'bold' }} {...props} />,
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
              th: ({node, ...props}) => <TableCell sx={{ fontWeight: 'bold' }} {...props} />,
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
    <Card sx={{ minHeight: 450, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {renderContent()}
    </Card>
  );
};

export default OutputPanel;