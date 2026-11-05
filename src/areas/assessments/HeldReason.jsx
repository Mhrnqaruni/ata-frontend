// The line that says why an answer has no mark (design §3.5): a warning icon and "Not marked: {reason}", on the
// review page and in the answer key dialog. Also exports small helpers that tidy a reason's words.
// Area: assessments

import { Box } from '@mui/material';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';

// A reason is one sentence, sent with or without its full stop.
export const sentence = (text = '') => {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
};

// Results held before Phase 1.33 kept their reason in the feedback, after "Needs review: " (TODO #106).
export const reasonFromFeedback = (feedback) => (feedback || '').replace(/^Needs review:\s*/i, '');

// A Quick hold's reason starts with its question's label ("01.7: …"), which a line that shows the label drops.
export const withoutLabel = (reason = '', label = '') =>
  label && reason.startsWith(`${label}: `) ? reason.slice(label.length + 2) : reason;

const line = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '6px',
  fontSize: 14,
  lineHeight: '20px',
  color: 'var(--mst-ink)',
};

export default function HeldReason({ reason }) {
  return (
    <Box sx={line}>
      <WarningAmberRounded
        aria-hidden="true"
        sx={{ fontSize: 16, mt: '2px', flexShrink: 0, color: 'var(--mst-warn)' }}
      />
      <span>Not marked: {sentence(reason)}</span>
    </Box>
  );
}
