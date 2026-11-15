// The live page before the start (design.md §3.7; Phase 1.47 §3.1, §3.3): the join card beside the Start panel (the
// pace as one line with Change, the line on latecomers and one large Start quiz), then who's here, full width.
// Area: quizzes

import { useState } from 'react';
import { Alert, Box, ButtonBase, Collapse, Paper, Typography } from '@mui/material';
import JoinCard from '../shared/JoinCard';
import { WORDS } from '../words';
import MainAction from './MainAction';
import NameChips from './NameChips';
import PaceMenu from './PaceMenu';
import { LIVE } from './words';

// From 900 px of page, the join card (3 parts) and the Start panel (2 parts, at least 320 px) share the first row and
// who's here takes the second. Narrower, the three stack in that order.
const WIDE = '@container (min-width: 900px)';
const small = { fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink-2)' };

// people: roomPeople()'s groups; pace: { auto, cooldown }; onPace(auto) changes it; action and actions: the main button.
// code: the join code; onPresent opens Present's big join screen; status: "Reconnecting…" while the room's link is down.
export default function Lobby({ people, pace, onPace, paceError, action, actions, code, onPresent, status }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        gridTemplateColumns: 'minmax(0, 1fr)',
        [WIDE]: { gridTemplateColumns: 'minmax(0, 3fr) minmax(320px, 2fr)' },
      }}
    >
      <JoinCard code={code} onBoard={onPresent} status={status} />
      <Paper
        className="mst-rim"
        sx={{ p: 3, borderRadius: '20px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}
        data-mst="live-start"
      >
        <div>
          <PaceMenu auto={pace.auto} cooldown={pace.cooldown} onPace={onPace} />
          {paceError ? (
            <Alert severity="error" sx={{ mt: 1 }}>
              {paceError}
            </Alert>
          ) : null}
        </div>
        <Typography sx={{ fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-3)' }}>
          {LIVE.canStillJoin}
        </Typography>
        {/* Start quiz keeps to the panel's foot when the join card makes the row taller. */}
        <Box sx={{ mt: 'auto' }}>
          <MainAction action={action} busy={actions.busy} onPress={actions.onPress} fullWidth />
        </Box>
        {actions.error ? (
          <Alert severity="error" onClose={actions.clearError}>
            {actions.error}
          </Alert>
        ) : null}
      </Paper>
      <WhoIsHere people={people} />
    </Box>
  );
}

// "24 of 28 here" and the names, then the missing (folded) and anyone not on the class list.
function WhoIsHere({ people }) {
  const [showMissing, setShowMissing] = useState(false);
  const { here, missing, walkIns, expected } = people;
  const nobody = !here.length && !walkIns.length;
  return (
    <Paper
      className="mst-rim"
      sx={{ p: 3, borderRadius: '20px', display: 'grid', gap: 2, minWidth: 0, [WIDE]: { gridColumn: '1 / -1' } }}
      data-mst="live-here"
    >
      <Typography
        component="h2"
        aria-live="polite"
        sx={{ fontSize: 17, lineHeight: '24px', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}
      >
        {nobody ? LIVE.waitingForPupils : LIVE.here(here.length, expected)}
      </Typography>
      {here.length ? <NameChips people={here} /> : null}
      {missing.length ? (
        <div>
          <ButtonBase
            onClick={() => setShowMissing((open) => !open)}
            aria-expanded={showMissing}
            sx={{
              ...small,
              borderRadius: '8px',
              textAlign: 'left',
              '&.Mui-focusVisible': { outline: '2px solid var(--mst-accent)' },
            }}
          >
            {LIVE.missing}: {missingLine(missing)}
          </ButtonBase>
          <Collapse in={showMissing}>
            <NameChips people={missing} max={200} sx={{ mt: 1 }} />
          </Collapse>
        </div>
      ) : null}
      {walkIns.length ? (
        <Box>
          <Typography sx={{ ...small, mb: 1 }}>
            {WORDS.notOnClassList} ({walkIns.length})
          </Typography>
          <NameChips people={walkIns} />
        </Box>
      ) : null}
    </Paper>
  );
}

// "Cleo, Dan +2": the first two missing names, then how many more.
function missingLine(missing) {
  const names = missing.slice(0, 2).map((person) => person.name);
  return missing.length > 2 ? `${names.join(', ')} ${LIVE.more(missing.length - 2)}` : names.join(', ');
}
