// The homework's one list (design.md §3.10; SP1): name · state · "8 of 12 answered" · points and time once handed in,
// on a solid surface in 48 px rows (two lines below 900 px). A pupil who started opens their answers.
// Area: quizzes

import { useState } from 'react';
import { Box, Button, ButtonBase, Collapse, Paper, Typography } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import { WORDS } from '../words';
import { HOMEWORK, formatDuration } from './words';

const PAGE = 50;
const WIDE = '@container (min-width: 900px)';
const TONES = { handedIn: 'var(--mst-ok)', working: 'var(--mst-accent)', notStarted: 'var(--mst-ink-3)' };
const COLUMNS = 'minmax(0, 2fr) 136px 144px 104px 88px';
const head = { fontSize: 12, lineHeight: '16px', fontWeight: 600, color: 'var(--mst-ink-3)' };

// rows and walkIns: homeworkRows()'s; onOpen(row) shows a pupil's answers; empty: the line when nobody is listed.
export default function PupilList({ rows, walkIns, onOpen, empty }) {
  const [shown, setShown] = useState(PAGE);
  const [openWalkIns, setOpenWalkIns] = useState(false);
  return (
    <Paper
      data-mst="homework-pupils"
      sx={{
        bgcolor: 'var(--mst-solid)',
        border: '1px solid var(--mst-edge)',
        borderRadius: '20px',
        overflow: 'hidden',
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          display: 'none',
          [WIDE]: { display: 'grid' },
          gridTemplateColumns: COLUMNS,
          gap: 2,
          px: 2.5,
          py: 1.5,
          borderBottom: '1px solid var(--mst-edge)',
        }}
      >
        <span style={head}>{HOMEWORK.name}</span>
        <span style={head}>{HOMEWORK.status}</span>
        <span style={head}>{HOMEWORK.progress}</span>
        <span style={{ ...head, textAlign: 'right' }}>{HOMEWORK.points}</span>
        <span style={{ ...head, textAlign: 'right' }}>{HOMEWORK.time}</span>
      </Box>
      {rows.length ? (
        <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
          {rows.slice(0, shown).map((row) => (
            <PupilRow key={row.id} row={row} onOpen={onOpen} />
          ))}
        </Box>
      ) : (
        <Typography sx={{ px: 2.5, py: 3, fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink-2)' }}>
          {empty}
        </Typography>
      )}
      {rows.length > shown ? (
        <Box sx={{ px: 2.5, py: 1.5, borderTop: '1px solid var(--mst-edge)' }}>
          <Button size="small" onClick={() => setShown((count) => count + PAGE)}>
            {HOMEWORK.showMore(Math.min(PAGE, rows.length - shown))}
          </Button>
        </Box>
      ) : null}
      {walkIns.length ? (
        <Box sx={{ borderTop: '1px solid var(--mst-edge)' }}>
          <ButtonBase
            onClick={() => setOpenWalkIns((open) => !open)}
            aria-expanded={openWalkIns}
            sx={{
              ...head,
              width: '100%',
              justifyContent: 'flex-start',
              gap: 0.5,
              px: 2.5,
              py: 1.5,
              fontSize: 14,
              color: 'var(--mst-ink-2)',
            }}
          >
            {WORDS.notOnClassList} ({walkIns.length})
            <ExpandMoreRounded sx={{ fontSize: 18, transform: openWalkIns ? 'rotate(180deg)' : 'none' }} />
          </ButtonBase>
          <Collapse in={openWalkIns}>
            <Box component="ul" sx={{ m: 0, p: 0, listStyle: 'none' }}>
              {walkIns.map((row) => (
                <PupilRow key={row.id} row={row} onOpen={onOpen} />
              ))}
            </Box>
          </Collapse>
        </Box>
      ) : null}
    </Paper>
  );
}

// One pupil: a button when they've started (it opens their answers), a plain row before that.
function PupilRow({ row, onOpen }) {
  const handedIn = row.state === 'handedIn';
  const points = !handedIn ? '' : row.score == null ? HOMEWORK.marking : HOMEWORK.score(row.score, row.max);
  const cells = (
    <>
      <Box sx={{ minWidth: 0, fontSize: 14, lineHeight: '20px', fontWeight: 500, color: 'var(--mst-ink)' }}>
        {row.name}
        {row.number ? (
          <Box component="span" sx={{ ml: 1, fontSize: 12, color: 'var(--mst-ink-3)' }}>
            {row.number}
          </Box>
        ) : null}
      </Box>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: 12,
          lineHeight: '16px',
          fontWeight: 600,
          color: 'var(--mst-ink-2)',
        }}
      >
        <Box
          component="span"
          aria-hidden="true"
          className="mst-dot"
          sx={{ width: 8, height: 8, color: TONES[row.state] }}
        />
        {HOMEWORK[row.state]}
      </Box>
      {/* Below 900 px these three share the row's second line; from 900 px each is a column. */}
      <Box sx={{ gridColumn: '1 / -1', display: 'flex', gap: 2, [WIDE]: { display: 'contents' } }}>
        <Box sx={{ fontSize: 14, color: 'var(--mst-ink-2)', fontVariantNumeric: 'tabular-nums' }}>
          {row.state === 'notStarted' ? '' : HOMEWORK.answeredOf(row.answered, row.total)}
        </Box>
        <Box
          sx={{
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--mst-ink)',
            fontVariantNumeric: 'tabular-nums',
            [WIDE]: { textAlign: 'right' },
          }}
        >
          {points}
        </Box>
        <Box
          sx={{
            fontSize: 14,
            color: 'var(--mst-ink-2)',
            fontVariantNumeric: 'tabular-nums',
            [WIDE]: { textAlign: 'right' },
          }}
        >
          {handedIn ? formatDuration(row.seconds) : ''}
        </Box>
      </Box>
    </>
  );
  const layout = {
    width: '100%',
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) auto',
    columnGap: 2,
    rowGap: 0.5,
    alignItems: 'center',
    textAlign: 'left',
    minHeight: 60,
    px: 2.5,
    py: 1,
    [WIDE]: { gridTemplateColumns: COLUMNS, minHeight: 48, py: 0.5 },
  };
  return (
    <Box component="li" sx={{ borderTop: '1px solid var(--mst-edge)', '&:first-of-type': { borderTop: 0 } }}>
      {row.studentId ? (
        <ButtonBase
          onClick={() => onOpen(row)}
          aria-label={`${row.name}: ${HOMEWORK[row.state]}. ${HOMEWORK.answersOf(row.name)}`}
          sx={{
            ...layout,
            '&:hover': { bgcolor: 'var(--mst-row-hover)' },
            '&.Mui-focusVisible': { outline: '2px solid var(--mst-accent)', outlineOffset: -2 },
          }}
        >
          {cells}
        </ButtonBase>
      ) : (
        <Box sx={layout}>{cells}</Box>
      )}
    </Box>
  );
}
