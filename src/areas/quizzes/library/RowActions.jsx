// A quiz row's button (Phase 1.47 R12; design.md §3.10; ../words.js's stateActions): Open, small and filled, only on
// a quiz running live or as open homework. Starting, sending and results are the row's click and its ⋯ menu.
// Area: quizzes

import { Button } from '@mui/material';
import { stateActions } from '../words';
import { displayTitle } from './rows';

// quiz: a library item; onAction(action, quiz).
export default function RowActions({ quiz, onAction }) {
  return stateActions(quiz.state).map(({ action, label, variant }) => (
    <Button
      key={action}
      size="small"
      variant={variant}
      aria-label={`${label}: ${displayTitle(quiz)}`}
      onClick={() => onAction(action, quiz)}
      sx={{ whiteSpace: 'nowrap' }}
    >
      {label}
    </Button>
  ));
}
