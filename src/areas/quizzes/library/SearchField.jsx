// The quiz list's search (design.md §3.1): "Search quizzes", 280 px, with a "/" key hint. The list follows the typing
// 250 ms after the last key, "/" anywhere on the page puts the cursor here, and Esc clears it.
// Area: quizzes

import { useEffect, useRef, useState } from 'react';
import { Box, IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import SearchRounded from '@mui/icons-material/SearchRounded';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { LIBRARY } from './words';

const WAIT_MS = 250;

// value: the search in the address; onChange(text) is called once the typing pauses.
export default function SearchField({ value, onChange }) {
  const [text, setText] = useState(value);
  const sent = useRef(value); // the last text handed to onChange, so the address's echo of it isn't typed over
  const input = useRef(null);

  // A change from outside (Clear filters, the back button) shows in the field.
  useEffect(() => {
    if (value !== sent.current) {
      sent.current = value;
      setText(value);
    }
  }, [value]);

  // The list follows once the typing pauses.
  useEffect(() => {
    if (text === sent.current) return undefined;
    const timer = setTimeout(() => {
      sent.current = text;
      onChange(text);
    }, WAIT_MS);
    return () => clearTimeout(timer);
  }, [text, onChange]);

  // "/" anywhere outside a field puts the cursor in the search.
  useEffect(() => {
    const onKey = (event) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return;
      event.preventDefault();
      input.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const clearNow = () => {
    setText('');
    sent.current = '';
    onChange('');
  };

  return (
    <TextField
      inputRef={input}
      value={text}
      onChange={(event) => setText(event.target.value)}
      onKeyDown={(event) => event.key === 'Escape' && text && clearNow()}
      placeholder={LIBRARY.search}
      inputProps={{ 'aria-label': LIBRARY.search, role: 'searchbox', maxLength: 100, enterKeyHint: 'search' }}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SearchRounded sx={{ fontSize: 20, color: 'var(--mst-ink-2)' }} />
          </InputAdornment>
        ),
        endAdornment: (
          <InputAdornment position="end">
            {text ? (
              <Tooltip title={LIBRARY.clearSearch}>
                <IconButton aria-label={LIBRARY.clearSearch} edge="end" onClick={clearNow} size="small">
                  <CloseRounded fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : (
              <Tooltip title={LIBRARY.searchKey}>
                <Box
                  component="kbd"
                  aria-hidden="true"
                  sx={{
                    minWidth: 22,
                    px: 0.75,
                    border: '1px solid var(--mst-edge-control)',
                    borderRadius: '6px',
                    fontFamily: 'inherit',
                    fontSize: 12,
                    lineHeight: '18px',
                    fontWeight: 600,
                    textAlign: 'center',
                    color: 'var(--mst-ink-2)',
                  }}
                >
                  /
                </Box>
              </Tooltip>
            )}
          </InputAdornment>
        ),
      }}
      sx={{ width: { xs: '100%', sm: 280 } }}
    />
  );
}
