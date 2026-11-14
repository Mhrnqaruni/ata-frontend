// What a panel page shows while it loads, when it can't load, and when its range holds nothing (design §4, §5).
// Area: owner

import { Link } from 'react-router-dom';
import { Alert, Button, Skeleton } from '@mui/material';
import EmptyState from '../../../components/common/EmptyState';
import InsightsOutlined from '@mui/icons-material/InsightsOutlined';

export function Loading() {
  return (
    <div aria-label="Loading" className="owner-loading" role="status">
      <Skeleton height={132} variant="rounded" />
      <Skeleton height={260} variant="rounded" />
    </div>
  );
}

export function LoadError({ error, retry }) {
  const missing = error?.response?.status === 404;
  return (
    <Alert
      action={
        missing ? null : (
          <Button color="inherit" onClick={retry} size="small">
            Try again
          </Button>
        )
      }
      severity="error"
    >
      {missing
        ? error.response.data?.detail || 'There is nothing at this address.'
        : "Couldn't load this page. Check the connection, then try again."}
    </Alert>
  );
}

// "No AI use in Last 7 days." with a way to all time, as design §5 words it.
export function Empty({ title, allTime }) {
  return (
    <EmptyState
      action={
        allTime ? (
          <Button component={Link} to={allTime} variant="outlined">
            Show all time
          </Button>
        ) : null
      }
      icon={<InsightsOutlined />}
      title={title}
    />
  );
}
