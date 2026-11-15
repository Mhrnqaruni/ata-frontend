// The lobby's pace (Phase 1.47 R1; design.md §3.1): one quiet line, "Pace: I'll press Next", and Change, which opens a
// 300 px menu with the Start window's two choices and their lines, the current one ticked. No dialog.
// Area: quizzes

import { useRef, useState } from 'react';
import { Box, Button, ListItemIcon, Menu, MenuItem, Typography } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import { START } from '../editor/words';
import { LIVE } from './words';

// auto: the run moves on by itself; cooldown: its pause between questions, in seconds; onPace(auto) changes it.
export default function PaceMenu({ auto, cooldown, onPace }) {
  const line = useRef(null);
  const [anchor, setAnchor] = useState(null);
  const choices = [
    { auto: false, label: START.byHand, line: START.byHandLine },
    { auto: true, label: START.byItself, line: START.byItselfLine(cooldown) },
  ];
  const choose = (next) => {
    setAnchor(null);
    if (next !== auto) onPace(next);
  };
  return (
    <Box ref={line} sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1 }} data-mst="live-pace">
      <Typography sx={{ fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink-2)' }}>
        {LIVE.paceLine(auto ? START.byItself : START.byHand)}
      </Typography>
      <Button
        variant="text"
        size="small"
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        onClick={() => setAnchor(line.current)}
        sx={{ minWidth: 0, minHeight: 32, px: 1, ml: -1 }}
      >
        {LIVE.change}
      </Button>
      {/* It hangs from the line's left end, the Start panel's inner edge, so it opens under Change and stays inside
          the panel at every width (design check C1's P3: it overhung the panel's right edge). */}
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        slotProps={{ paper: { sx: { width: 300, maxWidth: 'calc(100vw - 32px)', mt: 0.5 } } }}
      >
        {choices.map((choice) => {
          const current = choice.auto === auto;
          return (
            <MenuItem
              key={String(choice.auto)}
              role="menuitemradio"
              aria-checked={current}
              onClick={() => choose(choice.auto)}
              sx={{ alignItems: 'flex-start', whiteSpace: 'normal', py: 1.25 }}
            >
              <ListItemIcon sx={{ mt: '1px' }}>
                {current ? <CheckRounded fontSize="small" sx={{ color: 'var(--mst-accent-ink)' }} /> : null}
              </ListItemIcon>
              <Box sx={{ display: 'grid', gap: 0.25, minWidth: 0 }}>
                <Box component="span" sx={{ fontSize: 14, lineHeight: '20px', fontWeight: 600 }}>
                  {choice.label}
                </Box>
                <Box component="span" sx={{ fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-2)' }}>
                  {choice.line}
                </Box>
              </Box>
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
}
