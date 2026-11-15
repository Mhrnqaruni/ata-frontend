// The open question on the teacher's page and on Present (design.md §3.7, §3.8): its number, words, picture, answers.
// The right answer and the counts show only after Show answers, so a mirrored laptop never gives it away (C2-4).
// Area: quizzes

import { Box, Typography } from '@mui/material';
import CheckCircleRounded from '@mui/icons-material/CheckCircleRounded';
import MathTextDisplay from '../../../components/common/MathTextDisplay';
import { config } from '../../../config';
import { srOnly } from '../shared/useCopy';
import { answerRows } from './answers';
import RightLine from './RightLine';
import { LIVE } from './words';

// question: the socket's question; key: the run's copy of it, with its right answer; number and total: its place;
// revealed: answers shown; counts: its answer counts (LV7); answered: how many answered it; marking: its typed answers
// wait for the AI's marks (C2); big: Present's size; phone: the page below 600 px (20/28, one answer per line, §3.6).
export default function QuestionCard({
  question,
  keyQuestion,
  number,
  total,
  revealed,
  counts,
  answered,
  marking = false,
  big = false,
  phone = false,
}) {
  const rows = answerRows(question, keyQuestion, { revealed, counts });
  const typed = question.type === 'short_answer';
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: big ? 3 : 2, minWidth: 0, flex: 1 }}>
      <Typography
        component="p"
        sx={{ fontSize: big ? 17 : 12, lineHeight: big ? '24px' : '16px', fontWeight: 600, color: 'var(--mst-ink-2)' }}
      >
        {LIVE.questionOf(number, total)}
      </Typography>
      <Typography
        component="h2"
        sx={{
          fontFamily: 'var(--font-display)',
          fontSize: big ? 44 : phone ? 20 : 30,
          lineHeight: big ? '52px' : phone ? '28px' : '36px',
          fontWeight: 600,
          letterSpacing: phone ? 0 : '-0.02em',
          color: 'var(--mst-ink)',
          // Words wrap only between words; a word breaks only when it's wider than the line (§3.6).
          overflowWrap: 'break-word',
        }}
      >
        <MathTextDisplay text={question.text} />
      </Typography>
      {question.media_url ? (
        <Box
          component="img"
          src={`${config.apiBaseUrl}${question.media_url}`}
          alt=""
          sx={{
            maxWidth: '100%',
            maxHeight: big ? 280 : 160,
            objectFit: 'contain',
            borderRadius: '12px',
            alignSelf: 'flex-start',
          }}
        />
      ) : null}
      {typed ? (
        <TypedAnswer keyQuestion={keyQuestion} revealed={revealed} big={big} phone={phone} />
      ) : (
        // The answers grow with the card, from 72 px up to 140 px, so a tall column beside it leaves no empty card (M3).
        // On a phone, one per line from 56 px (§3.6).
        <Box
          component="ul"
          sx={{
            display: 'grid',
            gridTemplateColumns: phone ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
            gridAutoRows: big ? 'minmax(104px, auto)' : phone ? 'minmax(56px, auto)' : 'minmax(72px, 140px)',
            flex: big || phone ? 'none' : 1,
            alignContent: 'start',
            gap: big ? 2 : phone ? 1 : 1.5,
            m: 0,
            p: 0,
          }}
        >
          {rows.map((row) => (
            <AnswerBox key={row.index} row={row} big={big} phone={phone} />
          ))}
        </Box>
      )}
      {revealed && question.type !== 'poll' && question.type !== 'multiple_choice' ? (
        <RightLine marking={marking} counts={counts} answered={answered} />
      ) : null}
    </Box>
  );
}

// One answer: its letter, its words and, once answers show, its count as a bar inside the box and its right mark.
function AnswerBox({ row, big, phone }) {
  return (
    <Box
      component="li"
      data-right={row.right ? 'true' : undefined}
      sx={{
        position: 'relative',
        overflow: 'hidden',
        listStyle: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: big ? 2 : 1.5,
        minHeight: big ? 104 : phone ? 56 : 72,
        px: big ? 3 : 2,
        py: phone ? 1 : 0,
        borderRadius: '16px',
        bgcolor: 'var(--mst-solid)',
        border: row.right ? '2px solid var(--mst-ok)' : '1px solid var(--mst-edge-control)',
      }}
    >
      {row.share != null ? (
        <Box
          aria-hidden="true"
          sx={{
            position: 'absolute',
            inset: 0,
            width: `${Math.round(row.share * 100)}%`,
            bgcolor: 'var(--mst-accent-tint)',
          }}
        />
      ) : null}
      <Box
        aria-hidden="true"
        sx={{
          position: 'relative',
          flex: 'none',
          display: 'grid',
          placeItems: 'center',
          width: big ? 40 : 28,
          height: big ? 40 : 28,
          borderRadius: '50%',
          border: '1px solid var(--mst-edge-control)',
          fontSize: big ? 17 : 12,
          fontWeight: 600,
          color: 'var(--mst-ink)',
        }}
      >
        {row.letter}
      </Box>
      <Box
        sx={{
          position: 'relative',
          flex: 1,
          minWidth: 0,
          fontSize: big ? 24 : 17,
          lineHeight: big ? '32px' : '24px',
          fontWeight: 500,
          color: 'var(--mst-ink)',
          overflowWrap: 'break-word',
        }}
      >
        <MathTextDisplay text={row.text} />
      </Box>
      {row.right ? (
        <>
          <CheckCircleRounded sx={{ position: 'relative', color: 'var(--mst-ok-ink)', fontSize: big ? 32 : 24 }} />
          <Box component="span" sx={srOnly}>
            {LIVE.rightAnswer}
          </Box>
        </>
      ) : null}
      {row.count != null ? (
        <Box
          component="span"
          aria-label={LIVE.chose(row.count)}
          sx={{
            position: 'relative',
            minWidth: big ? 40 : 28,
            textAlign: 'right',
            fontSize: big ? 24 : 17,
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: 'var(--mst-ink)',
          }}
        >
          {row.count}
        </Box>
      ) : null}
    </Box>
  );
}

// A short answer: pupils type it. Once answers show, the accepted answers.
function TypedAnswer({ keyQuestion, revealed, big, phone }) {
  const accepted = (keyQuestion?.correct_answer || []).map(String).filter(Boolean);
  return (
    <Box
      sx={{
        minHeight: big ? 104 : phone ? 56 : 72,
        display: 'flex',
        alignItems: 'center',
        px: big ? 3 : 2,
        py: phone ? 1 : 0,
        borderRadius: '16px',
        border: revealed ? '2px solid var(--mst-ok)' : '1px dashed var(--mst-edge-control)',
        bgcolor: 'var(--mst-solid)',
        fontSize: big ? 24 : 17,
        lineHeight: big ? '32px' : '24px',
        color: revealed ? 'var(--mst-ink)' : 'var(--mst-ink-2)',
      }}
    >
      {revealed && accepted.length ? LIVE.accepted(accepted.join(', ')) : LIVE.typeAnswer}
    </Box>
  );
}
