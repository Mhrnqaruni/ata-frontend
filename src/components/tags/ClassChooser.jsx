// The class chooser window (Phase 1.46, SOT-11; design.md §3.3): classes and student groups, with search, Recent first,
// ticks and pupil counts, grouped by year and quick with 200 classes. AudienceSelector and the quiz pages open it.
// Area: academics

import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  IconButton,
  InputAdornment,
  Link,
  Skeleton,
  Tab,
  Tabs,
  TextField,
  Typography,
} from '@mui/material';
import CloseRounded from '@mui/icons-material/CloseRounded';
import SearchRounded from '@mui/icons-material/SearchRounded';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import { useTeacherData } from '../../hooks/useTeacherData';
import { classColor } from '../common/classColor';
import { byName, groupByYear, MAX_CHOSEN, matches, pupils, toggle } from './classChoice';

// open; onClose: × or Esc, and nothing changes; onDone(value): Done or Enter. value is AudienceSelector's
// { class_ids, tag_ids, mode }, given back with the new ticks. recentClassIds: Recent's classes, newest first
// (classChoice.js's recentClassIds); without them there's no Recent, as on New assessment. groups: false leaves out
// the Student groups tab. Classes and groups come from the teacher's cache, as the Classes page has them.
export default function ClassChooser({ open, onClose, onDone, value, recentClassIds, groups = true, title }) {
  const titleId = useId();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={false}
      aria-labelledby={titleId}
      PaperProps={{
        'data-mst': 'class-chooser',
        sx: {
          width: 560,
          maxWidth: 'calc(100% - 16px)',
          height: 'min(640px, 80vh)',
          m: { xs: 1, sm: 4 },
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        },
      }}
    >
      <Chooser {...{ onClose, onDone, value, recentClassIds, groups, titleId }} title={title ?? 'Choose classes'} />
    </Dialog>
  );
}

// The window's content, made afresh each time it opens, so it starts from the value it was given.
function Chooser({ onClose, onDone, value, recentClassIds, groups, title, titleId }) {
  const listId = useId();
  const classesQuery = useTeacherData('classes');
  const groupsQuery = useTeacherData('tags');
  const [chosen, setChosen] = useState({ class_ids: value?.class_ids ?? [], tag_ids: value?.tag_ids ?? [] });
  const [tab, setTab] = useState('classes');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(-1);
  const [navigating, setNavigating] = useState(false);
  const [full, setFull] = useState(false);
  const search = useRef(null);
  const onClasses = tab === 'classes';
  const source = onClasses ? classesQuery : groupsQuery;
  const field = onClasses ? 'class_ids' : 'tag_ids';
  const classes = classesQuery.data;
  const studentGroups = groupsQuery.data?.tags;

  // Recent first (classes, before any typing), then the classes by year, or the groups by name.
  const sections = useMemo(() => {
    const found = matches(onClasses ? classes : studentGroups, query);
    if (!onClasses) return [{ key: 'groups', label: null, items: [...found].sort(byName) }];
    const recent = query
      ? []
      : (recentClassIds || [])
          .map((id) => (classes || []).find((item) => item.id === id))
          .filter(Boolean)
          .slice(0, 5);
    return [...(recent.length ? [{ key: 'recent', label: 'Recent', items: recent }] : []), ...groupByYear(found)];
  }, [onClasses, classes, studentGroups, query, recentClassIds]);
  const rows = sections.flatMap((section) => section.items.map((item) => ({ section, item })));
  const current = active < rows.length ? active : -1;

  useEffect(() => {
    if (current >= 0) document.getElementById(`${listId}-${current}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [current, listId]);

  const tick = (id) => {
    const next = toggle(chosen[field], id);
    setFull(next === chosen[field] && !chosen[field].includes(id));
    setChosen({ ...chosen, [field]: next });
  };
  const done = () => onDone({ mode: 'union', ...value, class_ids: chosen.class_ids, tag_ids: chosen.tag_ids });
  const find = (text) => {
    setQuery(text);
    setActive(-1);
    setNavigating(false);
  };
  // Typing filters; ↑ and ↓ move; Space ticks the row moved to; Enter is Done (Esc is the window's own).
  const onKey = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setNavigating(true);
      setActive(Math.max(0, Math.min(rows.length - 1, current + (event.key === 'ArrowDown' ? 1 : -1))));
    } else if (event.key === ' ' && navigating && rows[current]) {
      event.preventDefault();
      tick(rows[current].item.id);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      done();
    } else if (event.key.length === 1) setNavigating(false);
  };
  const count = chosen.class_ids.length + chosen.tag_ids.length;
  const kind = onClasses ? 'class' : 'student group';

  return (
    <>
      <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography id={titleId} component="h2" sx={{ flex: 1, fontSize: 20, lineHeight: '28px', fontWeight: 600 }}>
            {title}
          </Typography>
          <IconButton aria-label="Close" onClick={onClose} sx={{ mr: -1 }}>
            <CloseRounded />
          </IconButton>
        </Box>
        <TextField
          inputRef={search}
          autoFocus
          fullWidth
          placeholder={onClasses ? 'Search classes' : 'Search student groups'}
          value={query}
          onChange={(event) => find(event.target.value)}
          onKeyDown={onKey}
          sx={{ mt: 2 }}
          inputProps={{
            role: 'combobox',
            'aria-label': onClasses ? 'Search classes' : 'Search student groups',
            'aria-expanded': true,
            'aria-controls': listId,
            'aria-activedescendant': current >= 0 ? `${listId}-${current}` : undefined,
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchRounded fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: query ? (
              <InputAdornment position="end">
                <IconButton
                  aria-label="Clear the search"
                  edge="end"
                  onClick={() => {
                    find('');
                    search.current?.focus();
                  }}
                >
                  <CloseRounded fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
        {query ? (
          <Typography role="status" sx={{ mt: 1, fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-2)' }}>
            {rows.length} found
          </Typography>
        ) : null}
        {groups ? (
          <Tabs
            value={tab}
            onChange={(_, next) => {
              setTab(next);
              find('');
            }}
            sx={{ mt: 1, minHeight: 40 }}
          >
            <Tab value="classes" label="Classes" sx={{ minHeight: 40 }} />
            <Tab value="groups" label="Student groups" sx={{ minHeight: 40 }} />
          </Tabs>
        ) : null}
      </Box>
      <Box
        id={listId}
        role="listbox"
        aria-multiselectable="true"
        aria-label={onClasses ? 'Classes' : 'Student groups'}
        sx={{ flex: 1, minHeight: 0, overflowY: 'auto', px: 1.5, pb: 1 }}
      >
        {source.isPending ? (
          Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height={44} sx={{ mx: 1 }} />)
        ) : source.isError && !source.data ? (
          <Alert severity="error" action={<Button onClick={() => source.refetch()}>Try again</Button>} sx={{ m: 1 }}>
            {onClasses ? "Couldn't load your classes." : "Couldn't load your student groups."}
          </Alert>
        ) : !(onClasses ? classes : studentGroups)?.length ? (
          <Typography sx={{ p: 2, fontSize: 14, color: 'var(--mst-ink-2)' }}>
            {onClasses ? 'You have no classes yet · ' : 'You have no student groups yet · '}
            <Link component={RouterLink} to={onClasses ? '/classes' : '/classes?view=tags'}>
              {onClasses ? 'Create a class' : 'Create a group'}
            </Link>
          </Typography>
        ) : !rows.length ? (
          <Typography sx={{ p: 2, fontSize: 14, color: 'var(--mst-ink-2)' }}>
            No {kind} matches &lsquo;{query.trim()}&rsquo;
          </Typography>
        ) : (
          rows.map(({ section, item }, index) => (
            <Fragment key={`${section.key}-${item.id}`}>
              {section.label && (index === 0 || rows[index - 1].section !== section) ? (
                <Box role="presentation" sx={groupHead}>
                  {section.label}
                </Box>
              ) : null}
              <Box
                id={`${listId}-${index}`}
                role="option"
                aria-selected={chosen[field].includes(item.id)}
                // A row never takes the focus, so the keys go on working in the search box after a click.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  tick(item.id);
                  setActive(index);
                }}
                sx={{ ...row, bgcolor: index === current ? 'var(--mst-accent-tint)' : 'transparent' }}
              >
                <Checkbox
                  checked={chosen[field].includes(item.id)}
                  tabIndex={-1}
                  disableRipple
                  inputProps={{ 'aria-hidden': true }}
                  sx={{ p: 0, pointerEvents: 'none' }}
                />
                {onClasses ? (
                  <Box aria-hidden="true" sx={{ ...dot, bgcolor: classColor(item.name) }} />
                ) : (
                  <GroupsOutlined aria-hidden="true" sx={{ fontSize: 18, color: 'var(--mst-ink-3)' }} />
                )}
                <Box sx={name}>{item.name}</Box>
                <Box sx={countText}>{pupils(onClasses ? item.studentCount : item.count)}</Box>
              </Box>
            </Fragment>
          ))
        )}
      </Box>
      <Box
        sx={{ display: 'flex', alignItems: 'center', gap: 1, px: 3, py: 1.5, borderTop: '1px solid var(--mst-edge)' }}
      >
        <Typography sx={{ fontSize: 14, lineHeight: '20px', color: 'var(--mst-ink-2)' }}>{count} selected</Typography>
        {count ? (
          <>
            <Box aria-hidden="true" sx={{ color: 'var(--mst-ink-3)' }}>
              ·
            </Box>
            <Button size="small" onClick={() => setChosen({ class_ids: [], tag_ids: [] })}>
              Clear
            </Button>
          </>
        ) : null}
        {full ? (
          <Typography role="status" sx={{ fontSize: 12, lineHeight: '16px', color: 'var(--mst-warn-ink)' }}>
            Up to {MAX_CHOSEN} {onClasses ? 'classes' : 'groups'}
          </Typography>
        ) : null}
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" onClick={done} data-mst="chooser-done">
          Done
        </Button>
      </Box>
    </>
  );
}

// A year's head stays at the top of the list while its classes scroll under it.
const groupHead = {
  position: 'sticky',
  top: 0,
  zIndex: 1,
  px: 1,
  py: 0.75,
  fontSize: 12,
  lineHeight: '16px',
  fontWeight: 600,
  color: 'var(--mst-ink-3)',
  bgcolor: 'var(--mst-solid)',
};
const row = {
  display: 'flex',
  alignItems: 'center',
  gap: 1.5,
  minHeight: 44,
  px: 1,
  borderRadius: '10px',
  cursor: 'pointer',
  '&:hover': { bgcolor: 'var(--mst-accent-tint)' },
};
const dot = { width: 10, height: 10, borderRadius: '50%', flex: 'none' };
const name = {
  flex: 1,
  minWidth: 0,
  fontSize: 14,
  lineHeight: '20px',
  fontWeight: 500,
  color: 'var(--mst-ink)',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
const countText = { fontSize: 12, lineHeight: '16px', color: 'var(--mst-ink-2)', fontVariantNumeric: 'tabular-nums' };
