// The pupils' fixed bottom bar (Phase 1.47 design.md §3.5; ST9): the main button within thumb reach, 56 px, on glass 2,
// with one line above it: the hint before a choice, "Not sent. Try again" or "Saved ✓". Homework's Back is 48 px.
// Area: quizzes

import { Box } from '@mui/material';

// status: the line above the button(s); small: that line at 12/16 (homework's saved line); children: the button(s).
export default function BottomBar({ status, small = false, children }) {
  return (
    <Box
      className="mst-g2"
      data-mst="pupil-bar"
      sx={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 10,
        px: 2,
        pt: 2,
        pb: 'calc(16px + env(safe-area-inset-bottom))',
        borderTop: '1px solid var(--mst-edge)',
      }}
    >
      <Box sx={{ maxWidth: 480, mx: 'auto', display: 'grid', gap: 1 }}>
        {status ? (
          <Box
            role="status"
            aria-live="polite"
            sx={{
              fontSize: small ? 12 : 14,
              lineHeight: small ? '16px' : '20px',
              color: small ? 'var(--mst-ink-2)' : 'var(--mst-ink)',
              textAlign: 'center',
            }}
          >
            {status}
          </Box>
        ) : null}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            '& > .MuiButton-contained': { minHeight: 56, fontSize: 17 },
            '& > .MuiButton-outlined': { minHeight: 48, flex: 'none', px: 2.5 },
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
}
