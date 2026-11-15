// The pupils' screens' frame (Phase 1.47 design.md §3.5): a phone column its screens fill, a calm ground, one glow
// at the top, the logo when joining, a quiet "Reconnecting…" line, and room for a fixed Send or Next bar.
// Area: quizzes

import { Alert, Box } from '@mui/material';
import logo from '../../../assets/mst_logo_no_bg.png';
import { PLAY } from './words';

// The play screens' own ground, over the app's: its colour, and one glow at the top so the content is the loudest thing.
const GROUND = 'radial-gradient(90% 32% at 50% 0%, var(--mst-bloom-blue), transparent 72%), var(--mst-ground)';

// logo: show the logo (joining); bar: a fixed bar sits at the bottom; note: 'reconnecting' or 'slow' while it retries.
export default function PlayFrame({ children, logo: withLogo = false, bar = false, note = null }) {
  return (
    <Box
      component="main"
      sx={{
        maxWidth: 480,
        mx: 'auto',
        px: 2,
        pt: withLogo ? 5 : 2,
        pb: bar ? 'calc(124px + env(safe-area-inset-bottom))' : 4,
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        aria-hidden="true"
        sx={{ position: 'fixed', inset: 0, zIndex: -1, pointerEvents: 'none', background: GROUND }}
      />
      {note ? (
        <Alert severity={note === 'slow' ? 'warning' : 'info'} sx={{ mb: 2, flex: 'none' }} role="status">
          {note === 'slow' ? `${PLAY.reconnecting} ${PLAY.slow}` : PLAY.reconnecting}
        </Alert>
      ) : null}
      {withLogo ? <img alt="MySmartTeach" className="mst-join-logo" src={logo} /> : null}
      {children}
    </Box>
  );
}
