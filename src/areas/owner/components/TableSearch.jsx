// A table's search field: it waits for a pause in typing, then puts q in the address (back to page 1).
// The field follows the address too, so Back and links bring their search with them.
// Area: owner

import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { InputAdornment, OutlinedInput } from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';

export default function TableSearch({ placeholder }) {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') || '';
  const [typed, setTyped] = useState(q);
  useEffect(() => setTyped(q), [q]);
  useEffect(() => {
    if (typed.trim() === q) return undefined;
    const timer = setTimeout(
      () =>
        setParams(
          (current) => {
            const next = new URLSearchParams(current);
            if (typed.trim()) next.set('q', typed.trim());
            else next.delete('q');
            next.delete('page');
            return next;
          },
          { replace: true }
        ),
      300
    );
    return () => clearTimeout(timer);
  }, [typed, q, setParams]);
  return (
    <OutlinedInput
      className="owner-table-search"
      inputProps={{ 'aria-label': placeholder, maxLength: 100 }}
      onChange={(event) => setTyped(event.target.value)}
      placeholder={placeholder}
      size="small"
      startAdornment={
        <InputAdornment position="start">
          <SearchRounded fontSize="small" />
        </InputAdornment>
      }
      value={typed}
    />
  );
}
