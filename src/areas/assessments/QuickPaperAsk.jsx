// The Quick page's one ask (design §3.2): the answer sheets show the answers but not the questions, so Quick asks
// once for the question paper, and the answer key if the teacher has it. Marking carries on in the same job.
// Area: assessments

import { Box, Button } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import { QuickFiles } from '../../components/assessments/QuickAssessmentParts';

// What the page says when sending the paper fails (design §4), or when going on without it fails.
export const PAPER_FAILED = 'Couldn’t send the question paper. Your files are still here; try again.';
export const SKIP_FAILED = 'Couldn’t continue without the question paper. Try again.';

// Divs, not <p>: the page's `.qa-page p` rule would override these sizes.
const line = { mt: '16px', fontSize: 15, lineHeight: '24px', color: 'var(--mst-ink-2)' };
const kept = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  m: '8px 0 20px',
  fontSize: 12,
  lineHeight: '16px',
  fontWeight: 500,
  color: 'var(--mst-ink-3)',
};

// Under the action bar while no paper is chosen (the SOT's decision 10): it goes on with no paper, and Quick never
// asks again. If the reading then finds no questions, the job fails with its own message.
export function QuickPaperSkip({ busy, onSkip }) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        mt: '12px',
        textAlign: 'right',
        '@media (max-width: 599px)': { alignItems: 'center', textAlign: 'center' },
      }}
    >
      <Button
        size="small"
        disabled={busy}
        onClick={onSkip}
        // Neutral, so the paper's dropzone stays the page's one accent action (design review B2).
        sx={{ color: 'var(--mst-ink-2)', '@media (pointer: coarse)': { minHeight: 44 } }}
      >
        Continue without the question paper
      </Button>
      <Box sx={{ fontSize: 12, lineHeight: '16px', fontWeight: 500, color: 'var(--mst-ink-3)' }}>
        Only if the answer sheets show the questions.
      </Box>
    </Box>
  );
}

export default function QuickPaperAsk({ files, pick, busy, onError }) {
  return (
    <div>
      <div className="qa-status-heading">
        <span className="qa-status-icon">
          <DescriptionOutlined />
        </span>
        <div>
          <h2>Add the question paper</h2>
        </div>
      </div>
      <Box sx={line}>
        The answer sheets seem to show the answers but not the questions, so they can’t be marked yet.
      </Box>
      <Box sx={kept}>
        <CheckRounded sx={{ fontSize: 16 }} />
        Your answer sheets are saved.
      </Box>
      <QuickFiles
        primary
        title="Choose the question paper"
        hint="PDF or images"
        files={files.questions}
        onChange={pick('questions')}
        disabled={busy}
        onError={onError}
      />
      <Box sx={{ mt: 2 }}>
        <QuickFiles
          label="Answer key (optional)"
          title="Add answer key"
          hint="Answer key or mark scheme · PDF or images"
          files={files.keys}
          onChange={pick('keys')}
          disabled={busy}
          onError={onError}
        />
      </Box>
    </div>
  );
}
