// The results page's alert for questions held for every student (design §3.3): each one's label, marks and reason,
// and Mark by hand, which opens the next student still to mark on that question. Re-marking waits (TODO #125).
// Area: assessments

import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { Alert, AlertTitle, Box, Button } from '@mui/material';
import { sentence, withoutLabel } from './HeldReason';

const SHOWN = 3; // then "Show all {n} questions", like Quick's file lists
const touch = { '@media (pointer: coarse)': { minHeight: 44 } };

export default function HeldQuestionsAlert({ jobId, held }) {
  const [all, setAll] = useState(false);
  if (!held.length) return null;
  return (
    <Alert severity="warning" sx={{ mb: 2 }}>
      <AlertTitle>
        {held.length === 1 ? "1 question wasn't marked" : `${held.length} questions weren't marked`}
      </AlertTitle>
      {(all ? held : held.slice(0, SHOWN)).map((question, i) => (
        <Box key={question.questionId} sx={{ mt: i ? 2 : 0 }}>
          <Box sx={{ fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink)' }}>
            <Box component="strong" sx={{ fontWeight: 600 }}>
              {question.printedLabel}
            </Box>{' '}
            · {question.maxScore} {question.maxScore === 1 ? 'mark' : 'marks'} —{' '}
            {sentence(withoutLabel(question.reason, question.printedLabel))}
            {question.markedByHand > 0 &&
              ` Marked by hand for ${question.markedByHand} of ${question.students} students.`}
          </Box>
          {question.nextEntityId && (
            <Button
              size="small"
              component={RouterLink}
              to={`/assessments/${jobId}/review/${question.nextEntityId}?question=${encodeURIComponent(question.questionId)}`}
              sx={{ mt: 1, ...touch }}
            >
              Mark by hand
            </Button>
          )}
        </Box>
      ))}
      {held.length > SHOWN && !all && (
        <Button size="small" onClick={() => setAll(true)} sx={{ mt: 1, ...touch }}>
          Show all {held.length} questions
        </Button>
      )}
    </Alert>
  );
}
