// The range button in a page's header: presets with a check, custom dates, and "Days are in UTC." (§3.13).
// Area: owner

import { useState } from 'react';
import { Button, Divider, ListItemIcon, Menu, MenuItem, TextField } from '@mui/material';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import useRange, { PRESETS } from '../useRange';

export default function RangeMenu() {
  const range = useRange();
  const [anchor, setAnchor] = useState(null);
  const [custom, setCustom] = useState(null);
  const close = () => {
    setAnchor(null);
    setCustom(null);
  };
  const pick = (next) => {
    range.choose(next);
    close();
  };
  const valid = custom && custom.from && custom.to && custom.from <= custom.to;
  return (
    <>
      <Button
        aria-haspopup="menu"
        className="owner-range"
        data-mst="owner-range"
        endIcon={<ExpandMoreRounded />}
        onClick={(event) => setAnchor(event.currentTarget)}
        startIcon={<CalendarTodayOutlined />}
        variant="outlined"
      >
        {range.label}
      </Button>
      <Menu anchorEl={anchor} onClose={close} open={Boolean(anchor)}>
        {PRESETS.map((preset) => (
          <MenuItem
            aria-checked={range.key === preset.key}
            key={preset.key}
            onClick={() => pick({ key: preset.key })}
            role="menuitemradio"
          >
            {preset.label}
            {range.key === preset.key ? <CheckRounded className="owner-menu-check" fontSize="small" /> : null}
          </MenuItem>
        ))}
        <Divider />
        {custom ? (
          <div className="owner-range-custom">
            <TextField
              InputLabelProps={{ shrink: true }}
              label="From"
              onChange={(event) => setCustom({ ...custom, from: event.target.value })}
              size="small"
              type="date"
              value={custom.from}
            />
            <TextField
              InputLabelProps={{ shrink: true }}
              label="To"
              onChange={(event) => setCustom({ ...custom, to: event.target.value })}
              size="small"
              type="date"
              value={custom.to}
            />
            <Button disabled={!valid} onClick={() => pick({ key: 'custom', ...custom })} variant="contained">
              Apply
            </Button>
          </div>
        ) : (
          <MenuItem
            aria-checked={range.key === 'custom'}
            onClick={() => setCustom({ from: range.start || range.end, to: range.end })}
            role="menuitemradio"
          >
            <ListItemIcon>
              <CalendarTodayOutlined fontSize="small" />
            </ListItemIcon>
            Custom dates…
          </MenuItem>
        )}
        <p className="owner-range-foot">Days are in UTC.</p>
      </Menu>
    </>
  );
}
