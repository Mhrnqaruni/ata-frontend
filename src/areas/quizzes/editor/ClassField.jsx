// Step 1's classes (design.md §3.2, §3.3; SOT-11): a field-like button that opens the class chooser, with Recent
// first, then one line saying who can join, with the server's count of pupils.
// Area: quizzes

import { useEffect, useId, useState } from 'react';
import { ButtonBase, Chip, MenuItem, TextField } from '@mui/material';
import ClassChooser from '../../../components/tags/ClassChooser';
import { countPupils } from './api';
import { useAudienceNames, useRecentClassIds } from './queries';
import { DETAILS, joinNames } from './words';

const EMPTY = { class_ids: [], tag_ids: [], mode: 'union' };
const SHOWN = 4; // chips before "+3 more"

// The server's count of pupils for a choice (it counts a pupil in two classes once), or null until it answers.
function usePupilCount(audience) {
  const [count, setCount] = useState(null);
  const key = JSON.stringify(audience ?? EMPTY);
  useEffect(() => {
    const selection = JSON.parse(key);
    setCount(null);
    if (!selection.class_ids.length && !selection.tag_ids.length) return undefined;
    let current = true;
    countPupils(selection)
      .then((value) => current && setCount(value))
      .catch(() => current && setCount(null));
    return () => {
      current = false;
    };
  }, [key]);
  return count;
}

// keepOne: the server keeps a saved quiz's classes, so an empty choice is refused with a line saying so.
export default function ClassField({ audience, locked, keepOne, onChange }) {
  const labelId = useId();
  const [choosing, setChoosing] = useState(false);
  const [refused, setRefused] = useState(false);
  const recent = useRecentClassIds();
  const names = useAudienceNames(audience);
  const count = usePupilCount(audience);
  const spec = audience ?? EMPTY;
  const all = [...names.classes, ...names.groups];
  const counted = count ? ` · ${DETAILS.pupils(count)}` : '';
  const line = locked
    ? DETAILS.pairLocked
    : refused
      ? DETAILS.keepClasses
      : !all.length
        ? DETAILS.anyone
        : count === 0
          ? DETAILS.nobody
          : `${DETAILS.onlyPupils(joinNames(all))}${counted}`;

  return (
    <div className="mst-qe-field">
      <div className="mst-qe-label" id={labelId}>
        {DETAILS.classes}
      </div>
      <ButtonBase
        className="mst-qe-picker"
        aria-labelledby={labelId}
        aria-haspopup="dialog"
        disabled={locked}
        onClick={() => setChoosing(true)}
        data-mst="classes-field"
      >
        {all.length ? (
          <>
            {all.slice(0, SHOWN).map((name, index) => (
              <Chip key={`${index}-${name}`} label={name} size="small" />
            ))}
            {all.length > SHOWN ? <span className="mst-qe-more">+{all.length - SHOWN} more</span> : null}
          </>
        ) : (
          <span className="mst-qe-placeholder">{DETAILS.chooseClasses}</span>
        )}
      </ButtonBase>
      <div className="mst-qe-help-row">
        <p className="mst-qe-help" data-tone={refused || count === 0 ? 'warn' : undefined} role="status">
          {line}
        </p>
        {spec.class_ids.length && spec.tag_ids.length && !locked ? (
          <TextField
            select
            value={spec.mode}
            onChange={(event) => onChange({ ...spec, mode: event.target.value })}
            SelectProps={{ SelectDisplayProps: { 'aria-label': DETAILS.combine, 'aria-labelledby': undefined } }}
            sx={{ minWidth: 240, '& .MuiOutlinedInput-root': { minHeight: 32, fontSize: 14 } }}
          >
            <MenuItem value="union">{DETAILS.combineAny}</MenuItem>
            <MenuItem value="filter">{DETAILS.combineFilter}</MenuItem>
          </TextField>
        ) : null}
      </div>
      <ClassChooser
        open={choosing}
        value={spec}
        recentClassIds={recent}
        onClose={() => setChoosing(false)}
        onDone={(next) => {
          setChoosing(false);
          const empty = !next.class_ids.length && !next.tag_ids.length;
          setRefused(empty && keepOne);
          if (empty && keepOne) return;
          onChange(empty ? null : next);
        }}
      />
    </div>
  );
}
