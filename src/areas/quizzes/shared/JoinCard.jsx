// The join card (Phase 1.47 R3; design.md §3.3): "Pupils join at", the address, the code with a visible Copy, and the
// QR code. Live: a click anywhere but Copy opens the big join screen. Homework: its due line; the QR code opens bigger.
// Area: quizzes

import { useState } from 'react';
import { Box, ButtonBase, Paper, Popover, Tooltip, Typography } from '@mui/material';
import ContentCopyRounded from '@mui/icons-material/ContentCopyRounded';
import OpenInFullRounded from '@mui/icons-material/OpenInFullRounded';
import { light, monoFont } from '../../../theme/tokens';
import { formatDateTime } from '../../../utils/dates';
import JoinQr from './JoinQr';
import { JOIN, cleanCode, joinAddress, joinLink } from './joining';
import { copyText, srOnly, useCopy } from './useCopy';
import { WORDS } from '../words';

// A card under 440 px (a phone) stacks its parts: the address, the code with Copy, a 96 px QR code, the bottom line.
const NARROW = '@container (max-width: 439.98px)';
const focusRing = { '&.Mui-focusVisible': { outline: '2px solid var(--mst-accent)', outlineOffset: 2 } };

// code: the run's join code. onBoard: live only, opens Present's big join screen, from a click anywhere on the card or
// on "Show on the board". due: homework's due date, for its bottom line. status: "Reconnecting…", beside the label.
export default function JoinCard({ code, onBoard, due, status }) {
  const [done, copy] = useCopy();
  const [bigQr, setBigQr] = useState(null);
  const shown = cleanCode(code);
  const copied = done ? (done.ok ? WORDS.copied : WORDS.notCopied) : null;
  const live = Boolean(onBoard);
  // The QR code on white in both themes, with its quiet margin, so a phone camera reads it off the screen.
  const tile = (
    <Box
      sx={{
        p: 1,
        borderRadius: '12px',
        bgcolor: light.solid,
        lineHeight: 0,
        '& svg': { width: 112, height: 112 },
        [NARROW]: { '& svg': { width: 96, height: 96 } },
      }}
    >
      <JoinQr code={shown} size={112} />
    </Box>
  );
  return (
    <Paper
      className="mst-rim"
      data-mst="join-card"
      onClick={live ? onBoard : undefined}
      sx={{
        containerType: 'inline-size',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        minWidth: 0,
        p: 3,
        borderRadius: '20px',
        ...(live && {
          cursor: 'pointer',
          transition: 'border-color 160ms var(--mst-ease)',
          // The edge turns a control's edge, so the card reads as one big button (the glass rim steps aside).
          '&:hover': { borderColor: 'var(--mst-edge-control)', '&::before': { opacity: 0 } },
        }),
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          gridTemplateAreas: '"label qr" "address qr" "code qr" "foot qr"',
          columnGap: 3,
          alignItems: 'center',
          [NARROW]: {
            gridTemplateColumns: 'minmax(0, 1fr)',
            gridTemplateAreas: '"label" "address" "code" "qr" "foot"',
          },
        }}
      >
        <Box sx={{ gridArea: 'label', display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 1.5 }}>
          <Typography sx={{ fontSize: 12, lineHeight: '16px', fontWeight: 600, color: 'var(--mst-ink-2)' }}>
            {JOIN.joinAt}
          </Typography>
          {status}
        </Box>
        <Typography
          sx={{
            gridArea: 'address',
            mt: 0.25,
            fontSize: 17,
            lineHeight: '24px',
            fontWeight: 600,
            overflowWrap: 'anywhere',
          }}
        >
          {joinAddress()}
        </Typography>
        <Box sx={{ gridArea: 'code', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
          <Box
            component="span"
            sx={{ fontFamily: monoFont, fontSize: 40, lineHeight: '48px', fontWeight: 600, letterSpacing: '0.08em' }}
          >
            {shown}
          </Box>
          {/* One button that shows the icon, then "Copied ✓" in its place for 2 s, so focus stays on it. */}
          <Tooltip title={copied ? '' : JOIN.copyCode}>
            <ButtonBase
              aria-label={`${JOIN.copyCode} ${shown}`}
              onClick={(event) => {
                event.stopPropagation();
                copy('code', () => copyText(shown));
              }}
              sx={{
                minWidth: 36,
                height: 36,
                px: copied ? 1 : 0,
                borderRadius: '10px',
                fontSize: 14,
                lineHeight: '20px',
                fontWeight: 600,
                color: copied ? 'var(--mst-ink)' : 'var(--mst-ink-2)',
                '&:hover': { bgcolor: 'var(--mst-accent-tint)', color: 'var(--mst-accent-ink)' },
                ...focusRing,
              }}
            >
              {copied ?? <ContentCopyRounded sx={{ fontSize: 20 }} />}
            </ButtonBase>
          </Tooltip>
          <Box component="span" role="status" sx={srOnly}>
            {copied ?? ''}
          </Box>
        </Box>
        <Box sx={{ gridArea: 'qr', [NARROW]: { justifySelf: 'start', mt: 2 } }}>
          {live ? (
            tile
          ) : (
            <ButtonBase
              onClick={(event) => setBigQr(event.currentTarget)}
              aria-label={WORDS.enlargeQr}
              aria-haspopup="dialog"
              sx={{ borderRadius: '12px', ...focusRing }}
            >
              {tile}
            </ButtonBase>
          )}
        </Box>
        <Box sx={{ gridArea: 'foot', mt: 0.75, [NARROW]: { mt: 1.5 } }}>
          {live ? (
            <ButtonBase
              onClick={(event) => {
                event.stopPropagation();
                onBoard();
              }}
              sx={{
                gap: 0.75,
                minHeight: 28,
                borderRadius: '8px',
                fontSize: 14,
                lineHeight: '20px',
                fontWeight: 600,
                color: 'var(--mst-accent-ink)',
                ...focusRing,
              }}
            >
              <OpenInFullRounded sx={{ fontSize: 18 }} />
              {JOIN.board}
            </ButtonBase>
          ) : due ? (
            <Typography sx={{ fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-2)' }}>
              {JOIN.due(formatDateTime(due))}
            </Typography>
          ) : null}
        </Box>
      </Box>
      <Popover
        open={Boolean(bigQr)}
        anchorEl={bigQr}
        onClose={() => setBigQr(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { p: 2, textAlign: 'center' } } }}
      >
        <JoinQr code={shown} size={240} title={joinLink(shown)} />
        <Typography sx={{ mt: 1, fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-2)' }}>
          {joinLink(shown).replace(/^https?:\/\//, '')}
        </Typography>
      </Popover>
    </Paper>
  );
}
