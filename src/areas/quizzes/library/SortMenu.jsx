// The sort as a menu, "Sort: Last used ▾", for two-line rows below 1100 px, where the column heads don't sort
// (design.md §3.1): Last used, Name (A–Z), Newest or Oldest, each in its own direction.
// Area: quizzes

import { useState } from 'react';
import { Button, Menu, MenuItem } from '@mui/material';
import ArrowDropDownRounded from '@mui/icons-material/ArrowDropDownRounded';
import { SORTS } from './filters';
import { LIBRARY } from './words';

// sort, order: the list's; onSort(sort) picks a sort in its own direction.
export default function SortMenu({ sort, order, onSort }) {
  const [anchor, setAnchor] = useState(null);
  const turned = order && order !== SORTS[sort]; // a head flipped it while the rows were one line
  const name = turned ? LIBRARY.turned[sort] : LIBRARY.sorts[sort];
  return (
    <>
      <Button
        size="small"
        endIcon={<ArrowDropDownRounded />}
        aria-haspopup="menu"
        aria-expanded={Boolean(anchor)}
        onClick={(event) => setAnchor(event.currentTarget)}
        sx={{ color: 'var(--mst-ink)', fontWeight: 500 }}
      >
        {LIBRARY.sortBy(name)}
      </Button>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        {Object.keys(SORTS).map((key) => (
          <MenuItem
            key={key}
            selected={key === sort && !turned}
            onClick={() => {
              setAnchor(null);
              onSort(key);
            }}
          >
            {LIBRARY.sorts[key]}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
