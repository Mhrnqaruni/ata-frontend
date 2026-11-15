// Tags for one quiz or many (design.md §3.1; L7; SOT-3, SOT-5): type to find a tag or make one; a tick shows a tag
// every chosen quiz has (a dash, some of them), and a click adds it to them all or takes it off. One request a click.
// Area: quizzes

import { useRef, useState } from 'react';
import { Box, Checkbox, MenuItem, MenuList, Popover, TextField, Typography } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import { solidPaper } from './RowMenu';
import { tagState } from './rows';
import { LIBRARY } from './words';

const TAG_MAX = 40; // a tag's name is 1 to 40 characters (SOT-3)

// anchor: what the menu opens from; quizzes: the chosen quizzes; tags: the teacher's tags; onToggle(tag) and
// onMake(name) run the action and resolve true when it worked; busy: an action is running.
export default function TagMenu({ anchor, quizzes, tags, busy, onClose, onToggle, onMake }) {
  const [text, setText] = useState('');
  const list = useRef(null);
  const typed = text.trim();
  const lower = typed.toLowerCase();
  const shown = lower ? (tags || []).filter((tag) => tag.name.toLowerCase().includes(lower)) : tags || [];
  const same = (tags || []).find((tag) => tag.name.toLowerCase() === lower);
  const close = () => {
    setText('');
    onClose();
  };
  const make = async () => {
    if (typed && (await onMake(typed))) setText('');
  };

  return (
    <Popover
      open={Boolean(anchor) && quizzes.length > 0}
      anchorEl={anchor}
      onClose={close}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      slotProps={{
        paper: { sx: { ...solidPaper, width: 280, maxHeight: 420, mt: 0.5, display: 'flex', flexDirection: 'column' } },
      }}
    >
      <Typography sx={{ px: 2, pt: 1.5, fontSize: 12, fontWeight: 600, color: 'var(--mst-ink-2)' }}>
        {LIBRARY.tagsFor(quizzes.length)}
      </Typography>
      <Box sx={{ p: 1 }}>
        <TextField
          autoFocus
          fullWidth
          placeholder={LIBRARY.findOrMakeTag}
          value={text}
          disabled={busy}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              list.current?.querySelector('[role^="menuitem"]')?.focus();
            }
            if (event.key !== 'Enter' || !typed) return;
            event.preventDefault();
            if (same) onToggle(same);
            else make();
          }}
          inputProps={{ 'aria-label': LIBRARY.findOrMakeTag, maxLength: TAG_MAX }}
        />
      </Box>
      <MenuList
        ref={list}
        aria-label={LIBRARY.tagsFor(quizzes.length)}
        sx={{ overflowY: 'auto', px: 0.75, pt: 0, pb: 0.75 }}
      >
        {shown.map((tag) => {
          const state = tagState(tag.id, quizzes);
          return (
            <MenuItem
              key={tag.id}
              role="menuitemcheckbox"
              aria-checked={state === 'all' ? 'true' : state === 'some' ? 'mixed' : 'false'}
              disabled={busy}
              onClick={() => onToggle(tag)}
              sx={{ gap: 1 }}
            >
              <Checkbox
                checked={state === 'all'}
                indeterminate={state === 'some'}
                tabIndex={-1}
                disableRipple
                size="small"
                sx={{ p: 0.25 }}
              />
              <Box component="span" sx={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {tag.name}
              </Box>
              <Box component="span" sx={{ fontSize: 12, fontWeight: 600, color: 'var(--mst-ink-2)' }}>
                {tag.quiz_count}
              </Box>
            </MenuItem>
          );
        })}
        {typed && !same ? (
          <MenuItem disabled={busy} onClick={make} sx={{ gap: 1, color: 'var(--mst-accent-ink)' }}>
            <AddRounded fontSize="small" />
            {LIBRARY.makeTag(typed)}
          </MenuItem>
        ) : null}
      </MenuList>
      {!tags?.length && !typed ? (
        <Typography sx={{ px: 2, pb: 1.5, fontSize: 14, color: 'var(--mst-ink-2)' }}>{LIBRARY.noTagsYet}</Typography>
      ) : null}
    </Popover>
  );
}
