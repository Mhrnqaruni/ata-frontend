// The Date filter's chip (design.md §3.1): This week · This month · This term · Pick dates, matched against the day
// each quiz was last used. A choice reads "Date: This week ×", or "Date: 3 Oct – 14 Nov ×" for picked days.
// Area: quizzes

import { useState } from 'react';
import { Box, Button, MenuItem, MenuList, Popover, TextField } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import { ChipButton } from './FilterChip';
import { dateLabel } from './filters';
import { LIBRARY } from './words';

const NAMED = [
  ['week', LIBRARY.thisWeek],
  ['month', LIBRARY.thisMonth],
  ['term', LIBRARY.thisTerm],
];

const Tick = ({ on }) => (
  <CheckRounded
    fontSize="small"
    sx={{ mr: 1, visibility: on ? 'visible' : 'hidden', color: 'var(--mst-accent-ink)' }}
  />
);

// filters: the list's filters (date, from, to); onChange({ date, from, to }).
export default function DateChip({ filters, onChange }) {
  const [anchor, setAnchor] = useState(null);
  const [range, setRange] = useState(null); // the days being picked, or null while the choices show
  const set = Boolean(filters.date);
  const close = () => {
    setAnchor(null);
    setRange(null);
  };
  const choose = (date) => {
    onChange({ date, from: '', to: '' });
    close();
  };

  return (
    <>
      <ChipButton
        name={LIBRARY.dateChip}
        label={set ? `${LIBRARY.dateChip}: ${dateLabel(filters)}` : LIBRARY.dateChip}
        set={set}
        open={Boolean(anchor)}
        onOpen={(event) => {
          setAnchor(event.currentTarget);
          setRange(filters.date === 'custom' ? { from: filters.from, to: filters.to } : null);
        }}
        onClear={() => onChange({ date: '', from: '', to: '' })}
      />
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{ paper: { sx: { mt: 0.75 } } }}
      >
        {range ? (
          <Box
            component="form"
            onSubmit={(event) => {
              event.preventDefault();
              onChange({ date: 'custom', from: range.from, to: range.to });
              close();
            }}
            sx={{ display: 'grid', gap: 1.5, width: 280, p: 2 }}
          >
            <TextField
              autoFocus
              type="date"
              label={LIBRARY.from}
              value={range.from}
              onChange={(event) => setRange({ ...range, from: event.target.value })}
              inputProps={{ max: range.to || undefined }}
            />
            <TextField
              type="date"
              label={LIBRARY.to}
              value={range.to}
              onChange={(event) => setRange({ ...range, to: event.target.value })}
              inputProps={{ min: range.from || undefined }}
            />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button size="small" onClick={() => setRange(null)}>
                {LIBRARY.back}
              </Button>
              <Button size="small" type="submit" variant="contained" disabled={!range.from && !range.to}>
                {LIBRARY.apply}
              </Button>
            </Box>
          </Box>
        ) : (
          <MenuList autoFocusItem aria-label={LIBRARY.dateChip} sx={{ width: 220, p: 0.75 }}>
            {NAMED.map(([date, words]) => (
              <MenuItem
                key={date}
                role="menuitemradio"
                aria-checked={filters.date === date}
                onClick={() => choose(date)}
              >
                <Tick on={filters.date === date} />
                {words}
              </MenuItem>
            ))}
            <MenuItem
              role="menuitemradio"
              aria-checked={filters.date === 'custom'}
              onClick={() => setRange({ from: filters.from, to: filters.to })}
            >
              <Tick on={filters.date === 'custom'} />
              {LIBRARY.pickDates}…
            </MenuItem>
          </MenuList>
        )}
      </Popover>
    </>
  );
}
