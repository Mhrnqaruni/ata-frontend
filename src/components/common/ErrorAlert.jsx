// An error alert for page and dialog errors that ends with the error's reference (design §3.6).
// Pass the caught error, or a message as children; pages move to it as they're touched.
// Area: platform

import { Alert } from '@mui/material';
import ErrorReference from './ErrorReference';

export default function ErrorAlert({ error, reference = error?.reference, children, ...props }) {
  return (
    <Alert severity="error" {...props}>
      {children ?? error?.message}
      <ErrorReference reference={reference} />
    </Alert>
  );
}
