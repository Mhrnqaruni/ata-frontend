// The editor's step line (design.md §3.0, item 4): "① Details — ② Questions — ③ Settings" on one 40 px line. Steps
// the teacher has reached can be clicked; the digits are 12 px and steps not yet reached keep 3:1 contrast (DR-8).
// Area: quizzes

import { Box } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import { STEPS } from './words';

// The done step's circle: the accent fill with the theme's white tick.
const doneNumber = { bgcolor: 'primary.main', color: 'primary.contrastText', borderColor: 'transparent' };

export default function StepLine({ step, reached, onStep }) {
  return (
    <nav aria-label="Steps" className="mst-qe-steps-nav">
      <ol className="mst-qe-steps">
        {STEPS.map((label, index) => {
          const state = index === step ? 'current' : index < step ? 'done' : 'next';
          const inner = (
            <>
              <Box component="span" className="mst-qe-step-num" sx={state === 'done' ? doneNumber : undefined}>
                {state === 'done' ? <CheckRounded aria-hidden="true" sx={{ fontSize: 16 }} /> : index + 1}
              </Box>
              <span className="mst-qe-step-label">{label}</span>
            </>
          );
          return (
            <li key={label} className="mst-qe-step" data-state={state}>
              {index ? <span aria-hidden="true" className="mst-qe-step-rule" /> : null}
              {index !== step && index <= reached ? (
                <button type="button" className="mst-qe-step-go" onClick={() => onStep(index)}>
                  {inner}
                </button>
              ) : (
                <span className="mst-qe-step-go" aria-current={state === 'current' ? 'step' : undefined}>
                  {inner}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
