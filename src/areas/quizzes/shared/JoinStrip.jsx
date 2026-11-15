// The join line on the teacher's live page during questions (design.md §3.7; Phase 1.47 §3.3): "Join code", the
// code, which a click copies, and the page's own buttons, on a 40 px glass line. Before the start, the JoinCard shows.
// Area: quizzes

import { Box, ButtonBase, Paper, Typography } from '@mui/material';
import { monoFont } from '../../../theme/tokens';
import { JOIN, cleanCode } from './joining';
import { copyText, srOnly, useCopy } from './useCopy';
import { WORDS } from '../words';

// code: the run's join code. actions: the page's Present and Share buttons, and "Reconnecting…", on the right.
export default function JoinStrip({ code, actions }) {
  const [done, copy] = useCopy();
  const shown = cleanCode(code);
  const copied = done ? (done.ok ? WORDS.copied : WORDS.notCopied) : null;
  return (
    <Paper
      className="mst-rim"
      data-mst="join-strip"
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1.5,
        minHeight: 40,
        px: 1.5,
        py: 0.5,
        borderRadius: '12px',
      }}
    >
      <Typography
        component="span"
        sx={{ fontSize: 12, lineHeight: '16px', fontWeight: 600, color: 'var(--mst-ink-2)', whiteSpace: 'nowrap' }}
      >
        {JOIN.joinCode}
      </Typography>
      <ButtonBase
        onClick={() => copy('code', () => copyText(shown))}
        aria-label={`Copy the code ${shown}`}
        sx={{
          minWidth: 88,
          minHeight: 32,
          px: 1,
          borderRadius: '10px',
          justifyContent: 'flex-start',
          fontFamily: monoFont,
          fontSize: 17,
          lineHeight: '24px',
          fontWeight: 600,
          letterSpacing: '0.04em',
          color: 'var(--mst-ink)',
          '&:hover': { bgcolor: 'var(--mst-accent-tint)' },
          '&.Mui-focusVisible': { outline: '2px solid var(--mst-accent)', outlineOffset: 2 },
        }}
      >
        {copied ? <Box sx={{ fontFamily: 'inherit', fontSize: 14, lineHeight: '20px' }}>{copied}</Box> : shown}
      </ButtonBase>
      <Box component="span" role="status" sx={srOnly}>
        {copied ?? ''}
      </Box>
      <Box sx={{ flex: 1 }} />
      {actions ? <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>{actions}</Box> : null}
    </Paper>
  );
}
