// The AI's mark beside an AI moment (design.md §3.4): a sparkle painted with --mst-ai-stroke, the AI gradient, which
// a plain icon colour can't take. pulse: a slow 1.2 s pulse while the AI works; reduced motion keeps it still.
// Area: quizzes

import { useId } from 'react';
import { Box } from '@mui/material';
import { keyframes } from '@mui/material/styles';

const breathe = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
`;

// The Material "auto awesome" sparkle, filled with a gradient between the theme's two AI colours.
export default function AiSparkle({ size = 20, pulse = false }) {
  const paint = `mst-ai-${useId().replace(/:/g, '')}`;
  return (
    <Box
      component="svg"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      sx={{
        flex: 'none',
        animation: pulse ? `${breathe} 1200ms ease-in-out infinite` : 'none',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    >
      <defs>
        <linearGradient id={paint} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--mst-ai-a)' }} />
          <stop offset="1" style={{ stopColor: 'var(--mst-ai-b)' }} />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${paint})`}
        d="m19 9 1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25z"
      />
    </Box>
  );
}
