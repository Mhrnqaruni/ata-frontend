// A quiz's or a run's classes on one short line, "8B, 9C +1", with every name in a tooltip when some are cut
// (design.md §3.1), or "No class yet" in ink-3 when it has none (§10, M2).
// Area: quizzes

import { Box, Tooltip } from '@mui/material';
import { classList } from '../words';

// classes: [{ id, name }], as the library, runs and summaries give them; max: the names shown before "+n".
export default function ClassNames({ classes, max = 2, sx }) {
  const names = (classes || []).map((item) => item?.name).filter(Boolean);
  const line = (
    <Box
      component="span"
      sx={{
        display: 'inline-block',
        maxWidth: '100%',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        verticalAlign: 'bottom',
        color: names.length ? 'inherit' : 'var(--mst-ink-3)',
        ...sx,
      }}
    >
      {classList(classes, { max })}
    </Box>
  );
  return names.length > max ? <Tooltip title={names.join(', ')}>{line}</Tooltip> : line;
}
