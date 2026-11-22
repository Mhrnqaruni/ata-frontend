// The notices above "Check the questions" in the new-assessment wizard, in design order: the AI draft's notice, the
// marks the AI set, a marks warning, and the questions still missing an answer or marking criteria ("Draft with AI").
// Area: assessments

import { Alert, AlertTitle, Button } from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';

// The AI style for a secondary AI action, as on the quiz editor's "Import with AI": the AI stroke as the outline.
const aiOutline = {
  border: '1px solid transparent',
  background: 'linear-gradient(var(--mst-solid), var(--mst-solid)) padding-box, var(--mst-ai-stroke) border-box',
  color: 'var(--mst-ink)',
  '&:hover': { borderColor: 'transparent', filter: 'brightness(1.04)' },
  '& .MuiButton-startIcon svg': { fill: 'url(#mst-ai-grad)' },
};

const blank = (value) => !String(value || '').trim();

export default function CheckNotices({ config, allocationWarning, drafting, disabled, onDraft }) {
  // Questions with neither an answer nor marking criteria: grading can't start until each has one.
  const gaps = config.sections.flatMap((s) => s.questions).filter((q) => blank(q.answer) && blank(q.rubric)).length;
  return (
    <>
      {config.referenceNotice && (
        <Alert severity={config.referenceStatus === 'needs_review' ? 'warning' : 'info'} sx={{ mb: 2 }}>
          {config.referenceNotice}
        </Alert>
      )}
      {config.marksNotice && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {config.marksNotice}
        </Alert>
      )}
      {allocationWarning && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {allocationWarning} Check and set each question’s marks before starting grading.
        </Alert>
      )}
      {gaps > 0 && (
        <Alert
          severity="warning"
          // On a phone the words keep the line beside the icon, and "Draft with AI" goes under them.
          sx={{ mb: 2, flexWrap: 'wrap', '& .MuiAlert-message': { flex: '1 1 240px' } }}
          action={
            <Button
              variant="outlined"
              onClick={onDraft}
              disabled={disabled}
              startIcon={<AutoAwesomeRounded />}
              sx={aiOutline}
            >
              {drafting ? 'Drafting…' : 'Draft with AI'}
            </Button>
          }
        >
          <AlertTitle sx={{ fontWeight: 600 }}>
            {gaps === 1 ? '1 question needs' : `${gaps} questions need`} a model answer or marking scheme
          </AlertTitle>
          Type them in below, or let AI draft them.
        </Alert>
      )}
    </>
  );
}
