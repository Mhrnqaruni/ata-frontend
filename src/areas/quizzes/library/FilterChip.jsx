// One filter chip and its menu (design.md §3.1, §6): "Class ▾" until something is chosen, then "Class: 8B ×", whose ×
// clears it. The menu ticks one or many choices, shows each one's count, and has a search box for long lists.
// Area: quizzes

import { useRef, useState } from 'react';
import { Box, Checkbox, Chip, MenuItem, MenuList, Popover, TextField, Typography } from '@mui/material';
import ArrowDropDownRounded from '@mui/icons-material/ArrowDropDownRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { chipLabel } from './filters';
import { LIBRARY } from './words';

const SEARCH_FROM = 8; // a list this long gets a search box

// A filter chip's look: a 32 px pill at 14/20 500; a chosen one in the accent tint and ink (design.md §6).
export const chipSx = (set) => ({
  height: 32,
  borderRadius: 999,
  fontSize: 14,
  fontWeight: 500,
  border: '1px solid',
  borderColor: set ? 'transparent' : 'var(--mst-edge-control)',
  bgcolor: set ? 'var(--mst-accent-tint)' : 'var(--mst-well)',
  color: set ? 'var(--mst-accent-ink)' : 'var(--mst-ink)',
  '& .MuiChip-label': { display: 'inline-flex', alignItems: 'center', pl: 1.5, pr: set ? 1 : 0.75 },
  '& .MuiChip-deleteIcon': {
    color: 'inherit',
    fontSize: 18,
    ml: '-2px',
    mr: 0.75,
    '&:hover': { color: 'inherit', opacity: 0.75 },
  },
  '&.MuiChip-clickable:hover': {
    bgcolor: set ? 'var(--mst-accent-tint)' : 'var(--mst-row-hover)',
    borderColor: set ? 'transparent' : 'var(--mst-accent-ink)',
  },
});

// The chip itself: its words, ▾ while nothing is chosen, × to clear once something is. name: the filter's name, for
// the ×'s own name ("Clear class").
export function ChipButton({ name, label, set, open, onOpen, onClear }) {
  return (
    <Chip
      label={
        <>
          {label}
          {set ? null : <ArrowDropDownRounded sx={{ fontSize: 20, ml: 0.25 }} />}
        </>
      }
      onClick={onOpen}
      onDelete={set ? onClear : undefined}
      deleteIcon={<CloseRounded titleAccess={LIBRARY.clearChip(name)} />}
      aria-haspopup="menu"
      aria-expanded={open}
      sx={chipSx(set)}
    />
  );
}

// label: "Class"; options: [{ value, label, count? }]; value: the chosen values; onChange(values). multiple: tick
// many (the menu stays open), or pick one (it closes). searchLabel: the search box's words; emptyText: no options;
// footer(close): a last row, such as Manage tags.
export default function FilterChip({
  label,
  options,
  value,
  onChange,
  multiple = true,
  searchLabel,
  emptyText,
  footer,
}) {
  const [anchor, setAnchor] = useState(null);
  const [find, setFind] = useState('');
  const list = useRef(null);
  const searchable = options.length >= SEARCH_FROM;
  const names = value.map((chosen) => options.find((option) => option.value === chosen)?.label ?? '…');
  const typed = find.trim().toLowerCase();
  const shown = typed ? options.filter((option) => option.label.toLowerCase().includes(typed)) : options;
  const close = () => setAnchor(null);
  const pick = (choice) => {
    const on = value.includes(choice);
    if (multiple) {
      onChange(on ? value.filter((item) => item !== choice) : [...value, choice]);
      return;
    }
    close();
    onChange(on ? [] : [choice]);
  };

  return (
    <>
      <ChipButton
        name={label}
        label={chipLabel(label, names)}
        set={value.length > 0}
        open={Boolean(anchor)}
        onOpen={(event) => {
          setFind('');
          setAnchor(event.currentTarget);
        }}
        onClear={() => onChange([])}
      />
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={close}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        slotProps={{
          paper: { sx: { width: 280, maxHeight: 440, mt: 0.75, display: 'flex', flexDirection: 'column' } },
        }}
      >
        {searchable ? (
          <Box sx={{ p: 1, pb: 0.5 }}>
            <TextField
              autoFocus
              fullWidth
              placeholder={searchLabel}
              value={find}
              onChange={(event) => setFind(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'ArrowDown') return;
                event.preventDefault();
                list.current?.querySelector('[role^="menuitem"]')?.focus();
              }}
              inputProps={{ 'aria-label': searchLabel }}
            />
          </Box>
        ) : null}
        {shown.length ? (
          <MenuList ref={list} autoFocusItem={!searchable} aria-label={label} sx={{ overflowY: 'auto', p: 0.75 }}>
            {shown.map((option) => {
              const on = value.includes(option.value);
              return (
                <MenuItem
                  key={option.value}
                  onClick={() => pick(option.value)}
                  role={multiple ? 'menuitemcheckbox' : 'menuitemradio'}
                  aria-checked={on}
                  sx={{ gap: 1 }}
                >
                  {multiple ? (
                    <Checkbox checked={on} tabIndex={-1} disableRipple size="small" sx={{ p: 0.25 }} />
                  ) : (
                    <CheckRounded
                      fontSize="small"
                      sx={{ visibility: on ? 'visible' : 'hidden', color: 'var(--mst-accent-ink)' }}
                    />
                  )}
                  <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {option.label}
                  </Box>
                  {option.count === undefined ? null : (
                    <Box
                      component="span"
                      sx={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--mst-ink-2)',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {option.count}
                    </Box>
                  )}
                </MenuItem>
              );
            })}
          </MenuList>
        ) : (
          <Typography sx={{ px: 2, py: 1.5, fontSize: 14, color: 'var(--mst-ink-2)' }}>
            {typed ? LIBRARY.noMatch(find.trim()) : emptyText}
          </Typography>
        )}
        {footer ? <Box sx={{ borderTop: '1px solid var(--mst-edge)', p: 0.75 }}>{footer(close)}</Box> : null}
      </Popover>
    </>
  );
}
