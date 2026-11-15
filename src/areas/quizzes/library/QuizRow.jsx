// One quiz in the list (Phase 1.47 design.md §3.10): title and tags, classes, Last used, Average, status words where the
// teacher must act, Open on running rows; one 48 px line, two below 1100 px, one cell on a phone. A click opens it.
// Area: quizzes

import { Box, Checkbox, IconButton, TableCell, TableRow, Tooltip } from '@mui/material';
import MoreHorizRounded from '@mui/icons-material/MoreHorizRounded';
import ClassNames from '../shared/ClassNames';
import RowActions from './RowActions';
import RowStatus from './RowStatus';
import TagChips from './TagChips';
import { averageText, averageTip, displayTitle, lastUsed, metaLine, openPath, rowStatus } from './rows';
import { LIBRARY } from './words';

const ellipsis = { minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' };

// Two short class names fit their column ("8B, 9C"); longer ones show one, then "+1" (every name is in its tooltip).
const classesShown = (classes) => ((classes?.[0]?.name.length ?? 0) + (classes?.[1]?.name.length ?? 0) <= 18 ? 2 : 1);

const line2 = { ...ellipsis, fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-2)' };

// The Quiz cell: the title and the tags that fit, then the second line when the row takes two.
function QuizCell({ quiz, title, to, layout, now, tagRoom, maxTags }) {
  return (
    <>
      <TagChips title={title} description={quiz.description} tags={quiz.tags} to={to} room={tagRoom} max={maxTags} />
      {layout === 'wide' ? null : <Box sx={line2}>{metaLine(quiz, now)}</Box>}
    </>
  );
}

// A phone's one cell across the card (the Designer's L2): the title beside ⋯, and under it the status words when the
// teacher must act, otherwise "Average 76% · Last used 3 Oct". There's no Open: a tap on the row opens the quiz.
function PhoneCell({ quiz, title, to, now, more }) {
  const status = rowStatus(quiz, now);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <TagChips title={title} description={quiz.description} to={to} max={0} />
        <Box sx={line2}>
          {status ? <RowStatus status={status} tip={false} /> : metaLine(quiz, now, { classes: false })}
        </Box>
      </Box>
      {more}
    </Box>
  );
}

// The Average cell: "72%", or "—" in ink-3, with the latest run's date, classes and pupils in its tooltip. The tooltip
// describes the number rather than replacing it, so a screen reader hears both.
function Average({ quiz, now }) {
  const run = quiz.latest_run;
  const missing = typeof run?.average_percent !== 'number';
  return (
    <Tooltip title={averageTip(quiz, now)} describeChild>
      <Box
        component="span"
        data-average={missing ? 'none' : 'shown'}
        sx={{ fontVariantNumeric: 'tabular-nums', color: missing ? 'var(--mst-ink-3)' : 'var(--mst-ink)' }}
      >
        {averageText(quiz)}
      </Box>
    </Tooltip>
  );
}

// columns: the table's, in order; tagRoom and maxTags: the Quiz cell's inside width and the most tag chips it shows;
// picked/onPick: the tick box (when the list can tick); onMenu(anchor, quiz): ⋯; highlight: a new copy, outlined for a
// moment; onAction(action, quiz): Open; onOpen(path): a click on the row.
export default function QuizRow(props) {
  const { quiz, columns, layout, now, tagRoom, maxTags, highlight, onAction, onOpen, picked, onPick, onMenu } = props;
  const to = openPath(quiz);
  const title = displayTitle(quiz);
  const used = lastUsed(quiz, now);
  const more = () => (
    <Tooltip title={LIBRARY.more}>
      <IconButton aria-label={LIBRARY.moreFor(title)} onClick={(event) => onMenu(event.currentTarget, quiz)}>
        <MoreHorizRounded />
      </IconButton>
    </Tooltip>
  );
  const cells = {
    pick: () => (
      <Checkbox
        className="mst-quiz-pick"
        checked={Boolean(picked)}
        onChange={() => onPick(quiz)}
        inputProps={{ 'aria-label': `Select ${title}` }}
      />
    ),
    quiz: () =>
      layout === 'phone' ? (
        <PhoneCell quiz={quiz} title={title} to={to} now={now} more={onMenu ? more() : null} />
      ) : (
        <QuizCell quiz={quiz} title={title} to={to} layout={layout} now={now} tagRoom={tagRoom} maxTags={maxTags} />
      ),
    classes: () => <ClassNames classes={quiz.classes} max={classesShown(quiz.classes)} />,
    used: () => (
      <Box component="span" sx={{ ...ellipsis, display: 'block', color: used.edited ? 'var(--mst-ink-3)' : 'inherit' }}>
        {used.text}
      </Box>
    ),
    average: () => <Average quiz={quiz} now={now} />,
    status: () => <RowStatus status={rowStatus(quiz, now)} />,
    action: () => <RowActions quiz={quiz} onAction={onAction} />,
    more,
  };
  return (
    <TableRow
      hover
      selected={Boolean(picked)}
      data-quiz={quiz.id}
      data-highlight={highlight ? 'true' : undefined}
      onClick={(event) => {
        if (!event.target.closest('a, button, input, label, [role="menu"]')) onOpen(to);
      }}
      sx={{
        cursor: 'pointer',
        ...(highlight ? { outline: '2px solid var(--mst-accent)', outlineOffset: '-2px' } : null),
      }}
    >
      {columns.map((column) => (
        <TableCell
          key={column.key}
          align={column.numeric ? 'right' : 'left'}
          padding={column.key === 'pick' ? 'none' : 'normal'}
        >
          {cells[column.key]()}
        </TableCell>
      ))}
    </TableRow>
  );
}
