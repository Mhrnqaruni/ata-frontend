// Joining a live quiz or homework (Phase 1.47 design.md §3.5; ST1, ST2, ST10, SP5): "Joining", the quiz's name and
// "with Ms Patel" on their own lines, the code done, the name and school number, Join, then the class-list check.
// Area: quizzes

import { useState } from 'react';
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import { Link as RouterLink } from 'react-router-dom';
import { monoFont } from '../../../theme/tokens';
import { PLAY } from './words';

// code: from the address; lookup: useJoinLookup()'s { data, error }; homework: the homework words;
// onJoin({ name, number }) joins, and a refusal shows here; initial: what the pupil typed before.
export default function JoinForm({ code, lookup = {}, homework = false, onJoin, initial = {} }) {
  const [name, setName] = useState(initial.name || '');
  const [number, setNumber] = useState(initial.number || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const filled = name.trim() !== '' && number.trim() !== '';

  const submit = async (event) => {
    event.preventDefault();
    if (!filled || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onJoin({ name: name.trim(), number: number.trim() });
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };

  if (lookup.error?.status === 404) {
    return (
      <Paper className="mst-rim" sx={{ p: 3, borderRadius: '20px', display: 'grid', gap: 2, textAlign: 'center' }}>
        <Typography sx={{ fontSize: 17, lineHeight: '24px', fontWeight: 600 }}>{lookup.error.message}</Typography>
        <Button component={RouterLink} to="/join" variant="outlined" size="large">
          {PLAY.joinWithCode}
        </Button>
      </Paper>
    );
  }
  const title = lookup.data?.quiz_title;
  const teacher = lookup.data?.teacher_name;
  return (
    <Paper
      component="form"
      onSubmit={submit}
      className="mst-rim"
      sx={{ p: 3, borderRadius: '20px', display: 'grid', gap: 2.5 }}
      noValidate
    >
      <div>
        {title ? (
          <JoinTitle title={title} teacher={teacher} />
        ) : (
          <Typography
            component="h1"
            sx={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: '30px', fontWeight: 600 }}
          >
            {PLAY.joinTitle}
          </Typography>
        )}
        {homework ? (
          <Typography sx={{ mt: 0.5, fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink-2)' }}>
            {PLAY.homeworkJoinLine}
          </Typography>
        ) : null}
        <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Box
            component="span"
            aria-label={`${PLAY.code} ${code}`}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              minHeight: 32,
              borderRadius: '999px',
              bgcolor: 'var(--mst-accent-tint)',
              fontFamily: monoFont,
              fontWeight: 600,
              letterSpacing: '0.04em',
            }}
          >
            {code}
            <CheckRounded aria-hidden="true" sx={{ fontSize: 16, color: 'var(--mst-accent-ink)' }} />
          </Box>
          <Button component={RouterLink} to="/join" size="small">
            {PLAY.changeCode}
          </Button>
        </Box>
      </div>
      <TextField
        label={PLAY.name}
        value={name}
        onChange={(event) => setName(event.target.value)}
        autoComplete="off"
        inputProps={{ maxLength: 50, style: { fontSize: 16 } }}
        autoFocus={!initial.number}
      />
      <TextField
        label={PLAY.number}
        value={number}
        onChange={(event) => setNumber(event.target.value)}
        autoComplete="off"
        inputProps={{ maxLength: 40, style: { fontSize: 16 } }}
        autoFocus={Boolean(initial.number)}
      />
      {error ? <Alert severity="error">{error}</Alert> : null}
      <div>
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={!filled || busy}
          sx={{ minHeight: 56, fontSize: 17 }}
        >
          {busy ? PLAY.joiningNow : PLAY.join}
        </Button>
        {!filled ? (
          <Typography sx={{ mt: 1, fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink-2)', textAlign: 'center' }}>
            {PLAY.joinHint}
          </Typography>
        ) : null}
      </div>
    </Paper>
  );
}

// "Joining", then the quiz's name on its own line (up to 2 lines), then "with Ms Patel": words break only between
// words, so no title ever breaks inside the teacher's name.
function JoinTitle({ title, teacher }) {
  return (
    <>
      <Typography sx={{ fontSize: 12, lineHeight: '16px', fontWeight: 600, color: 'var(--mst-ink-2)' }}>
        {PLAY.joiningLabel}
      </Typography>
      <Typography
        component="h1"
        title={title}
        sx={{
          mt: 0.5,
          fontFamily: 'var(--font-display)',
          fontSize: 22,
          lineHeight: '30px',
          fontWeight: 600,
          overflowWrap: 'break-word',
          display: '-webkit-box',
          WebkitBoxOrient: 'vertical',
          WebkitLineClamp: 2,
          overflow: 'hidden',
        }}
      >
        {title}
      </Typography>
      {teacher ? (
        <Typography sx={{ fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink-2)', overflowWrap: 'normal' }}>
          {PLAY.withTeacher(teacher)}
        </Typography>
      ) : null}
    </>
  );
}

// After joining with a number that isn't on the class list (on_class_list false): Change it · Join anyway.
export function ClassListCheck({ number, onChange, onContinue }) {
  return (
    <Paper
      className="mst-rim"
      sx={{ p: 3, borderRadius: '20px', display: 'grid', gap: 2 }}
      data-mst="pupil-class-check"
    >
      <Typography
        component="h1"
        sx={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: '30px', fontWeight: 600 }}
      >
        {PLAY.notOnList(number)}
      </Typography>
      <Typography sx={{ fontSize: 15, lineHeight: '24px', color: 'var(--mst-ink-2)' }}>{PLAY.notOnListLine}</Typography>
      <Box sx={{ display: 'grid', gap: 1 }}>
        <Button variant="contained" size="large" onClick={onChange} sx={{ minHeight: 56, fontSize: 17 }}>
          {PLAY.changeIt}
        </Button>
        <Button variant="outlined" size="large" onClick={onContinue} sx={{ minHeight: 48 }}>
          {PLAY.joinAnyway}
        </Button>
      </Box>
    </Paper>
  );
}
