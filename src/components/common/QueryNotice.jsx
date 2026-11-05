// A banner with a Retry button for a failed data load: a warning if old data is still shown, else an error.
// Area: platform

import React from 'react';
import { Alert, Button } from '@mui/material';

// A refresh failure must not replace a usable cached page with a blank error.
export default function QueryNotice({ query, label }) {
  if (!query.error) return null;
  const cached = query.data !== undefined;
  return (
    <Alert
      severity={cached ? 'warning' : 'error'}
      sx={{ mb: 2 }}
      action={
        <Button color="inherit" size="small" disabled={query.isFetching} onClick={() => query.refetch()}>
          Retry
        </Button>
      }
    >
      {cached
        ? `Could not refresh ${label}. Showing the last loaded data.`
        : `Could not load ${label}. Please try again.`}
    </Alert>
  );
}
