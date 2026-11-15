// The first visit, before any quiz (L14, DR-9; design.md §3.1): three ways to start (Write a quiz, Make one from a
// worksheet with AI, Try an example), then how pupils join. No filters, no search and one way to create.
// Area: quizzes

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, Box, ButtonBase, Typography } from '@mui/material';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import EditNoteOutlined from '@mui/icons-material/EditNoteOutlined';
import LightbulbOutlined from '@mui/icons-material/LightbulbOutlined';
import { createQuiz } from './api';
import { EXAMPLE_QUIZ } from './exampleQuiz';
import { LIBRARY } from './words';

// One 220×150 start tile (a full-width one on a phone): its icon, what it does and one line. `ai` gives the icon the
// AI gradient, which marks AI actions only (design.md §2). A longer title may take two lines; the row's tiles then
// grow together, never letting words spill out.
function StartTile({ icon, title, line, ai, busy, onClick }) {
  return (
    <ButtonBase
      className="mst-g1"
      disabled={busy}
      aria-busy={busy || undefined}
      onClick={onClick}
      sx={{
        width: { xs: '100%', sm: 220 },
        minHeight: 150,
        p: 2,
        borderRadius: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'flex-start',
        gap: 0.5,
        textAlign: 'left',
        transition: 'box-shadow 200ms var(--mst-ease), transform 120ms var(--mst-ease)',
        '&:hover': { boxShadow: 'var(--mst-g1-hi), var(--mst-shadow-hover)' },
        '&:active': { transform: 'scale(.98)' },
        '&.Mui-focusVisible': { outline: '2px solid var(--mst-accent-ink)', outlineOffset: '2px' },
        '@media (prefers-reduced-motion: reduce)': { transition: 'none', '&:active': { transform: 'none' } },
      }}
    >
      <Box component="span" className="mst-tile" data-size="sm" data-ai={ai ? 'true' : undefined} aria-hidden="true">
        {icon}
      </Box>
      <Typography component="span" sx={{ mt: 0.5, fontSize: 15, lineHeight: '24px', fontWeight: 600 }}>
        {title}
      </Typography>
      <Typography component="span" sx={{ fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink-2)' }}>
        {line}
      </Typography>
    </ButtonBase>
  );
}

export default function EmptyStart() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // The example is posted as a draft (SOT-11), then opens in the editor to explore.
  const tryExample = async () => {
    setBusy(true);
    setError('');
    try {
      const quiz = await createQuiz(EXAMPLE_QUIZ);
      navigate(`/quizzes/${quiz.id}/edit`);
    } catch (failure) {
      setError(failure.message);
      setBusy(false);
    }
  };

  return (
    <Box
      component="section"
      aria-labelledby="first-quiz"
      sx={{ display: 'grid', justifyItems: 'center', gap: 3, pt: { xs: 2, md: 6 }, pb: 4 }}
    >
      <Typography id="first-quiz" component="h2" sx={{ fontSize: 17, lineHeight: '24px', fontWeight: 600 }}>
        {LIBRARY.firstTitle}
      </Typography>
      {error ? <Alert severity="error">{error}</Alert> : null}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 2, width: '100%' }}>
        <StartTile
          icon={<EditNoteOutlined />}
          title={LIBRARY.writeQuiz}
          line={LIBRARY.writeLine}
          onClick={() => navigate('/quizzes/new')}
        />
        <StartTile
          icon={<AutoAwesomeOutlined />}
          ai
          title={LIBRARY.fromWorksheet}
          line={LIBRARY.fromWorksheetLine}
          onClick={() => navigate('/quizzes/new?start=import')}
        />
        <StartTile
          icon={<LightbulbOutlined />}
          title={LIBRARY.tryExample}
          line={busy ? LIBRARY.makingExample : LIBRARY.tryExampleLine}
          busy={busy}
          onClick={tryExample}
        />
      </Box>
      <Typography sx={{ fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink-2)', textAlign: 'center' }}>
        {LIBRARY.joinLine}
      </Typography>
    </Box>
  );
}
