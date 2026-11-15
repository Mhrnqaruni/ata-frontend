// The quiz list's table (design.md §3.1, §3.10, §4): a solid surface with sortable heads, one 48 px line a row when wide
// and two 60 px lines below that, 8 skeleton rows while loading, and its own message when it fails or nothing matches.
// Area: quizzes

import {
  Alert,
  Box,
  Button,
  Checkbox,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import QuizRow from './QuizRow';
import { LIBRARY } from './words';

// Each layout's columns, in order. `sort` is the API sort its head sets; widths are px (design.md §3.10's, with Last
// used widened where the theme's capital head and its arrow need it), and Quiz takes the rest. `pick` and `more` show
// only when the list can tick rows and has a ⋯ menu. A phone's row is one cell across the card (the Designer's L2),
// with ⋯ inside it and no Open: its second line names a running quiz, and a tap on the row opens it.
const COLUMNS = {
  wide: [
    { key: 'pick', width: 40 },
    { key: 'quiz', label: LIBRARY.quiz, sort: 'name' },
    { key: 'classes', label: LIBRARY.classes, width: 180 },
    { key: 'used', label: LIBRARY.lastUsed, width: 128, sort: 'last_used' },
    { key: 'average', label: LIBRARY.average, width: 96, numeric: true },
    { key: 'status', label: LIBRARY.status, width: 168 },
    { key: 'action', label: LIBRARY.actions, width: 88, hidden: true },
    { key: 'more', label: LIBRARY.more, width: 48, hidden: true },
  ],
  narrow: [
    { key: 'pick', width: 40 },
    { key: 'quiz', label: LIBRARY.quiz },
    { key: 'status', label: LIBRARY.status, width: 168 },
    { key: 'action', label: LIBRARY.actions, width: 88, hidden: true },
    { key: 'more', label: LIBRARY.more, width: 48, hidden: true },
  ],
  phone: [{ key: 'quiz', label: LIBRARY.quiz }],
};

export const columnsFor = (layout, { pick, more }) =>
  COLUMNS[layout].filter((column) => (column.key !== 'pick' || pick) && (column.key !== 'more' || more));

// Words only screen readers get (px, as MUI reads a bare 1 as 100%).
const hiddenText = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  m: '-1px',
  p: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
};

const CELL_PADDING = 24; // a cell's 12 px a side

// With one line a row, the heads stay in view as the rows scroll (design.md §2), just under the page's sticky header
// once it condenses (12 px from the top, then its 70 px), opaque there: the well's tint over the solid surface. Below
// that the condensed header can take two lines, and the two-line rows' heads (Quiz, Status) don't sort, so they scroll.
const HEAD_TOP = 82;
const headSx = (layout) => ({
  px: 1.5,
  py: 0,
  height: 40,
  whiteSpace: 'nowrap',
  ...(layout === 'wide' ? { position: 'sticky', top: HEAD_TOP, zIndex: 2 } : null),
  background: 'linear-gradient(var(--mst-well), var(--mst-well)), var(--mst-solid)',
});

// The tick boxes show on hover or focus, and stay once a row is ticked; touch screens always show them (§3.1).
const tableSx = (layout, picking) => ({
  tableLayout: 'fixed',
  '& thead th': headSx(layout),
  '& tbody td': { px: 1.5, py: 0, height: layout === 'wide' ? 48 : 60, borderColor: 'var(--mst-edge)' },
  '& .MuiTableCell-paddingNone': { px: 0.25, textAlign: 'center' },
  '& thead': layout === 'phone' ? { ...hiddenText, '& th': { p: 0 } } : null,
  '& .mst-quiz-pick': { opacity: picking ? 1 : 0, transition: 'opacity 150ms var(--mst-ease)' },
  '& tr:hover .mst-quiz-pick, & tr:focus-within .mst-quiz-pick': { opacity: 1 },
  '@media (hover: none)': { '& .mst-quiz-pick': { opacity: 1 } },
  '@media (prefers-reduced-motion: reduce)': { '& .mst-quiz-pick': { transition: 'none' } },
});

function Message({ columns, children }) {
  return (
    <TableRow hover={false}>
      <TableCell colSpan={columns.length} sx={{ height: 'auto !important', py: '24px !important' }}>
        {children}
      </TableCell>
    </TableRow>
  );
}

// rows: the library items; layout: wide, narrow or phone, for the list's `width`; sort: { sort, order } and
// onSort(sortKey) for the heads; state: { loading, error, onRetry, empty } (empty: what shows with no rows); rowProps:
// passed to every QuizRow; picking: { all, some, onAll, has(id), onPick(quiz) } once rows can be ticked; onMenu: ⋯.
export default function QuizTable({ rows, layout, width, sort, onSort, state, rowProps, picking, onMenu }) {
  const columns = columnsFor(layout, { pick: Boolean(picking), more: Boolean(onMenu) });
  const fixed = columns.reduce((sum, column) => sum + (column.width || 0), 0);
  // The Quiz cell's inside width, where the title comes first and up to 2 tag chips fill the rest (R14).
  const tagRoom = Math.max(0, (width ?? 1200) - fixed - CELL_PADDING);
  const maxTags = layout === 'phone' ? 0 : 2;
  const { highlightId, ...shared } = rowProps;
  const head = (column) => {
    if (column.key === 'pick')
      return (
        <Checkbox
          className="mst-quiz-pick"
          checked={Boolean(picking.all)}
          indeterminate={Boolean(picking.some)}
          onChange={picking.onAll}
          inputProps={{ 'aria-label': LIBRARY.selectAll }}
          sx={{ p: 0.75 }} // 36 px, inside the 40 px head
        />
      );
    if (column.hidden)
      return (
        <Box component="span" sx={hiddenText}>
          {column.label}
        </Box>
      );
    if (!column.sort || layout !== 'wide') return column.label;
    const active = sort.sort === column.sort;
    return (
      <TableSortLabel
        active={active}
        direction={active ? sort.order : 'desc'}
        hideSortIcon
        onClick={() => onSort(column.sort)}
      >
        {column.label}
      </TableSortLabel>
    );
  };

  let body;
  if (state.loading) {
    body = Array.from({ length: 8 }, (_, index) => (
      <TableRow key={index} hover={false}>
        {columns.map((column) => (
          <TableCell key={column.key}>{column.key === 'pick' ? null : <Skeleton height={20} />}</TableCell>
        ))}
      </TableRow>
    ));
  } else if (state.error && !rows.length) {
    body = (
      <Message columns={columns}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={state.onRetry}>
              {LIBRARY.tryAgain}
            </Button>
          }
        >
          {LIBRARY.loadFailed}
        </Alert>
      </Message>
    );
  } else if (!rows.length) {
    body = <Message columns={columns}>{state.empty}</Message>;
  } else {
    body = rows.map((quiz) => (
      <QuizRow
        key={quiz.id}
        quiz={quiz}
        columns={columns}
        layout={layout}
        picked={picking?.has(quiz.id)}
        onPick={picking?.onPick}
        onMenu={onMenu}
        highlight={highlightId === quiz.id}
        tagRoom={tagRoom}
        maxTags={maxTags}
        {...shared}
      />
    ));
  }

  return (
    <Box
      sx={{
        bgcolor: 'var(--mst-solid)',
        border: '1px solid var(--mst-edge)',
        borderRadius: '20px',
        overflow: 'clip', // rounds the corners without becoming a scroller, so the heads can stick
      }}
    >
      <Table aria-label={LIBRARY.table} sx={tableSx(layout, Boolean(picking?.some || picking?.all))}>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.key}
                align={column.numeric ? 'right' : 'left'}
                padding={column.key === 'pick' ? 'none' : 'normal'}
                sortDirection={column.sort && sort.sort === column.sort ? sort.order : false}
                sx={{ width: column.width }}
              >
                {head(column)}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>{body}</TableBody>
      </Table>
      {state.error && rows.length ? (
        <Typography role="status" sx={{ px: 2, py: 1, fontSize: 12, color: 'var(--mst-warn-ink)' }}>
          {LIBRARY.loadFailed}
        </Typography>
      ) : null}
    </Box>
  );
}
