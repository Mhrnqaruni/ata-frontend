// The pupils' short link, /join and /join/:code (SOT-8; design.md §3.12): a code box, then the code's run, live or
// homework (a live one first when both share it), opening today's pupil page; a finished quiz says so.
// Area: quizzes

import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, Paper, TextField, Typography } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import { cleanCode, joinPath, lookupJoin } from '../api/join';
import PlayFrame from './PlayFrame';
import { PLAY } from './words';

export default function JoinPage() {
  const navigate = useNavigate();
  const fromLink = cleanCode(useParams().code);
  const [code, setCode] = useState(fromLink);
  const [busy, setBusy] = useState(Boolean(fromLink));
  const [error, setError] = useState(null);

  // The code's run: its pupil page opens with the lookup, so it isn't read twice.
  const open = useCallback(
    async (value) => {
      const clean = cleanCode(value);
      if (!clean) return;
      setBusy(true);
      setError(null);
      try {
        const lookup = await lookupJoin(clean);
        navigate(joinPath(lookup.kind, clean), { replace: true, state: { lookup } });
      } catch (failure) {
        setError(failure.message);
        setBusy(false);
      }
    },
    [navigate]
  );
  // A code in the address (the QR code's short link) is looked up at once.
  useEffect(() => {
    if (fromLink) open(fromLink);
  }, [fromLink, open]);

  return (
    <PlayFrame logo>
      <Paper
        component="form"
        className="mst-rim"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          open(code);
        }}
        sx={{ p: 3, borderRadius: '20px', display: 'grid', gap: 2.5 }}
      >
        <div>
          <Typography
            component="h1"
            sx={{ fontFamily: 'var(--font-display)', fontSize: 24, lineHeight: '30px', fontWeight: 600 }}
          >
            {PLAY.joinTitle}
          </Typography>
          <Typography sx={{ mt: 0.5, fontSize: 15, lineHeight: '24px', color: 'var(--mst-ink-2)' }}>
            {PLAY.joinCodeLine}
          </Typography>
        </div>
        <TextField
          label={PLAY.code}
          value={code}
          onChange={(event) => setCode(cleanCode(event.target.value))}
          autoComplete="off"
          autoFocus={!fromLink}
          inputProps={{
            maxLength: 10,
            style: { fontSize: 24, letterSpacing: '0.2em', textAlign: 'center', fontFamily: 'var(--font-mono)' },
          }}
        />
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={!code || busy}
          sx={{ minHeight: 56, fontSize: 17 }}
        >
          {busy ? PLAY.finding : PLAY.findQuiz}
        </Button>
      </Paper>
    </PlayFrame>
  );
}
