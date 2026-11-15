// Step 1's quiz tags (design.md §3.2; SOT-3): the quiz's tags as chips, then "+ Add tag", a field to pick one of the
// teacher's tags or make a new one by typing it. A quiz has at most 20 tags, each up to 40 characters.
// Area: quizzes

import { useId, useState } from 'react';
import { Autocomplete, Button, Chip, TextField } from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { quizKeys } from '../queries';
import { makeTag } from './api';
import { useQuizTagList } from './queries';
import { DETAILS } from './words';

const MAX_TAGS = 20;
const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

// tags, state, error and change come from useTags.
export default function TagField({ tags, state, error, change }) {
  const labelId = useId();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const list = useQuizTagList();
  const [adding, setAdding] = useState(false);
  const [failure, setFailure] = useState('');
  const options = (list.data || []).filter((tag) => !tags.some((each) => each.id === tag.id));

  // A tag picked from the list, or the words typed: an existing tag of that name, or a new one.
  const pick = async (value) => {
    setAdding(false);
    if (!value) return;
    if (typeof value === 'object' && value.id) return change([...tags, { id: value.id, name: value.name }]);
    const name = String(typeof value === 'object' ? value.make : value)
      .trim()
      .slice(0, 40);
    if (!name || tags.some((tag) => same(tag.name, name))) return;
    const known = (list.data || []).find((tag) => same(tag.name, name));
    try {
      const tag = known ?? (await makeTag(name));
      if (!known) void queryClient.invalidateQueries({ queryKey: quizKeys.tags(user?.id) });
      setFailure('');
      change([...tags, { id: tag.id, name: tag.name }]);
    } catch (problem) {
      setFailure(problem.message);
    }
  };

  const message = state === 'failed' ? DETAILS.tagsFailed : error || failure;
  return (
    <div className="mst-qe-field">
      <div className="mst-qe-label" id={labelId}>
        {DETAILS.tags}
      </div>
      <div className="mst-qe-tags" role="group" aria-labelledby={labelId}>
        {tags.map((tag) => (
          <Chip
            key={tag.id}
            label={tag.name}
            size="small"
            onDelete={() => change(tags.filter((each) => each.id !== tag.id))}
          />
        ))}
        {adding ? (
          <Autocomplete
            freeSolo
            openOnFocus
            autoHighlight
            options={options}
            getOptionLabel={(option) =>
              typeof option === 'string' ? option : (option.name ?? DETAILS.makeTag(option.make))
            }
            filterOptions={(shown, { inputValue }) => {
              const typed = inputValue.trim();
              const found = shown.filter((tag) => tag.name.toLowerCase().includes(typed.toLowerCase()));
              const exact = typed && (list.data || []).some((tag) => same(tag.name, typed));
              return typed && !exact ? [...found, { make: typed }] : found;
            }}
            onChange={(_, value) => void pick(value)}
            onBlur={() => setAdding(false)}
            renderInput={(params) => (
              <TextField
                {...params}
                autoFocus
                placeholder={DETAILS.tagPlaceholder}
                inputProps={{ ...params.inputProps, maxLength: 40, 'aria-label': DETAILS.addTag }}
              />
            )}
            sx={{ width: 240, '& .MuiOutlinedInput-root': { minHeight: 32, py: 0 } }}
          />
        ) : (
          <Button
            size="small"
            startIcon={<AddRounded />}
            disabled={state !== 'ready' || tags.length >= MAX_TAGS}
            onClick={() => setAdding(true)}
          >
            {tags.length >= MAX_TAGS ? DETAILS.tagsFull : DETAILS.addTag}
          </Button>
        )}
      </div>
      {message ? (
        <p className="mst-qe-help" data-tone="warn" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
