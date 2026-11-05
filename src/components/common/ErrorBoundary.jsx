// Catches a crash anywhere in the app, reports it to our logs and shows a 'Something went wrong' page with
// Go to Home, Reload and the report's reference. Error details appear in development builds only.
// Area: platform

import React from 'react';
import { Box, Typography, Button, Container, Paper } from '@mui/material';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { getTheme } from '../../theme/theme';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import ErrorReference from './ErrorReference';
import { describeError, reportClientError } from '../../services/clientErrors';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null, reference: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error to console in development
    console.error('Error caught by boundary:', error, errorInfo);

    // Report the crash, and keep the reference its report was sent with (none when it wasn't sent).
    const reference = reportClientError({ kind: 'render', message: describeError(error) });
    this.setState({ error, errorInfo, reference });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      let mode = 'light';
      try {
        mode = localStorage.getItem('themeMode') === 'dark' ? 'dark' : 'light';
      } catch {
        /* Use the safe default when storage is unavailable. */
      }
      return (
        <ThemeProvider theme={getTheme(mode)}>
          <CssBaseline />
          <Container maxWidth="md" sx={{ mt: 8 }}>
            <Paper
              elevation={3}
              sx={{
                p: 4,
                textAlign: 'center',
                borderTop: '4px solid',
                borderColor: 'error.main',
              }}
            >
              <ErrorOutlineIcon sx={{ fontSize: 40, color: 'error.main', mb: 2 }} />

              <Typography variant="h4" gutterBottom fontWeight={600}>
                Something went wrong
              </Typography>

              <Typography variant="body1" color="text.secondary" paragraph>
                We're sorry for the inconvenience. The application encountered an unexpected error.
              </Typography>

              <Box sx={{ my: 3 }}>
                <Button variant="contained" size="large" onClick={this.handleReset} sx={{ mr: 2 }}>
                  Go to Home
                </Button>
                <Button variant="outlined" size="large" onClick={() => window.location.reload()}>
                  Reload Page
                </Button>
              </Box>

              {this.state.reference && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Send this reference if you report the problem.
                  </Typography>
                  <ErrorReference reference={this.state.reference} />
                </Box>
              )}

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <Box
                  sx={{
                    mt: 4,
                    p: 2,
                    bgcolor: 'action.hover',
                    borderRadius: 1,
                    textAlign: 'left',
                    overflow: 'auto',
                  }}
                >
                  <Typography variant="subtitle2" fontWeight={600} gutterBottom>
                    Error Details (Development Only):
                  </Typography>
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                    {this.state.error.toString()}
                  </Typography>
                  {this.state.errorInfo && (
                    <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap', mt: 1 }}>
                      {this.state.errorInfo.componentStack}
                    </Typography>
                  )}
                </Box>
              )}
            </Paper>
          </Container>
        </ThemeProvider>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
