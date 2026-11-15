// The editor's toast (design.md §3.4, §5): "Question deleted · Undo", "Answers C and D removed · Undo", or a plain
// message such as "Draft saved". It stays 6 s, and Undo puts things back as they were.
// Area: quizzes

import { Alert, Button, Snackbar } from '@mui/material';
import { QUESTIONS } from './words';

// toast: { message, undo?, id } or null; onClose clears it.
export default function UndoToast({ toast, onClose }) {
  return (
    <Snackbar
      key={toast?.id}
      open={Boolean(toast)}
      autoHideDuration={6000}
      onClose={(_, reason) => reason !== 'clickaway' && onClose()}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ bottom: { xs: 96, md: 104 } }}
    >
      <Alert
        className="mst-toast"
        severity="info"
        icon={false}
        action={
          toast?.undo ? (
            <Button
              size="small"
              onClick={() => {
                toast.undo();
                onClose();
              }}
            >
              {QUESTIONS.undo}
            </Button>
          ) : null
        }
      >
        {toast?.message}
      </Alert>
    </Snackbar>
  );
}
