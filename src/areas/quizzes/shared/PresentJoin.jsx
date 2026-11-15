// Present (design.md §3.8): the joining details full screen for the class, on MST's dark ground in both themes, with
// the teacher's control bar. Esc or Exit Present closes it; Space or → presses the page's main button.
// Area: quizzes

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import CloseFullscreenRounded from '@mui/icons-material/CloseFullscreenRounded';
import { getTheme } from '../../../theme/theme';
import { monoFont } from '../../../theme/tokens';
import JoinQr from './JoinQr';
import { cleanCode, joinAddress, joinLink } from './joining';
import { WORDS } from '../words';

const BAR_HIDES_MS = 3000;
const OWN_KEYS = 'button, a, input, textarea, select, [role="menuitem"]';

// open: shown or not; onClose: Esc, Exit Present, or leaving full screen. code: the join code, shown with its link and
// a 360 px QR code. here: the page's "24 of 28 here" and names, under them. children: what the class sees instead
// once the quiz runs (the question, its answers and the timer: Lane 6). controls: the page's main button and timer,
// in the bar beside Exit Present; onMain: what Space or → presses. Names, scores and right answers never show here.
export default function PresentJoin({ open, onClose, code, here, children, controls, onMain }) {
  const frame = useRef(null);
  const latest = useRef({ onClose, onMain });
  useEffect(() => {
    latest.current = { onClose, onMain };
  });
  const dark = useMemo(() => getTheme('dark'), []);
  const [barShown, setBarShown] = useState(true);

  // A layout effect, so the first frame is already dark and full screen is asked for within the teacher's click.
  useLayoutEffect(() => {
    if (!open) return undefined;
    // Dark in both themes, because projectors wash out light pages: the app's own dark tokens while it shows.
    const root = document.documentElement;
    const mode = root.getAttribute('data-theme-mode');
    root.setAttribute('data-theme-mode', 'dark');
    // Full screen where the browser allows it; a full window otherwise. Focus moves in, and back on closing.
    const opener = document.activeElement;
    frame.current?.focus();
    frame.current?.requestFullscreen?.().catch(() => {});
    setBarShown(true);
    let hide = setTimeout(() => setBarShown(false), BAR_HIDES_MS);
    const wake = () => {
      setBarShown(true);
      clearTimeout(hide);
      hide = setTimeout(() => setBarShown(false), BAR_HIDES_MS);
    };
    const onKey = (event) => {
      wake();
      if (event.key === 'Escape') latest.current.onClose?.();
      else if ((event.key === ' ' || event.key === 'ArrowRight') && !event.target.closest?.(OWN_KEYS)) {
        event.preventDefault();
        latest.current.onMain?.();
      }
    };
    // Esc in full screen leaves it without a keydown, so leaving full screen closes Present too.
    const onScreen = () => {
      if (!document.fullscreenElement) latest.current.onClose?.();
    };
    window.addEventListener('mousemove', wake);
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onScreen);
    return () => {
      clearTimeout(hide);
      window.removeEventListener('mousemove', wake);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onScreen);
      if (mode) root.setAttribute('data-theme-mode', mode);
      if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
      opener?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  const shown = cleanCode(code);
  return (
    <ThemeProvider theme={dark}>
      <Box
        ref={frame}
        role="dialog"
        aria-modal="true"
        aria-label={WORDS.present}
        tabIndex={-1}
        data-mst="present"
        sx={{
          outline: 'none',
          position: 'fixed',
          inset: 0,
          zIndex: 1400,
          overflow: 'auto',
          display: 'grid',
          placeItems: 'center',
          p: 4,
          pb: 12,
          bgcolor: 'var(--mst-ground)',
          color: 'var(--mst-ink)',
        }}
      >
        <div aria-hidden="true" className="mst-ground" />
        {children ?? (
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              component="p"
              sx={{ fontSize: 30, lineHeight: '36px', fontWeight: 600, color: 'var(--mst-ink)' }}
            >
              {WORDS.joinAt} {joinAddress()}
            </Typography>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '56px',
                my: 4.5,
              }}
            >
              <div>
                <Typography
                  sx={{ mb: 1, fontSize: 17, lineHeight: '24px', fontWeight: 600, color: 'var(--mst-ink-2)' }}
                >
                  {WORDS.typeTheCode}
                </Typography>
                <Box
                  sx={{ fontFamily: monoFont, fontSize: 120, lineHeight: 1, fontWeight: 600, letterSpacing: '0.06em' }}
                >
                  {shown}
                </Box>
              </div>
              <JoinQr code={shown} size={360} title={joinLink(shown)} />
            </Box>
            {here}
          </Box>
        )}
        <Box
          className="mst-g2"
          data-mst="present-bar"
          sx={{
            position: 'fixed',
            left: '50%',
            bottom: 24,
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            minHeight: 56,
            px: 1,
            borderRadius: '999px',
            opacity: barShown ? 1 : 0,
            pointerEvents: barShown ? 'auto' : 'none',
            transition: 'opacity 200ms var(--mst-ease)',
            '&:focus-within': { opacity: 1, pointerEvents: 'auto' },
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          }}
        >
          {controls}
          <Button startIcon={<CloseFullscreenRounded />} onClick={() => latest.current.onClose?.()}>
            {WORDS.exitPresent}
          </Button>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
