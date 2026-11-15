// The filter row above the quiz list (design.md §3.1, §3.10): Class · Date · Status · Tag · Live / Homework, "Clear
// filters", then the sort menu (two-line rows), the Archived chip (R11; out of the Status menu) and the count.
// Area: quizzes

import { useMemo } from 'react';
import { Box, Button, Chip, MenuItem, Typography } from '@mui/material';
import ArchiveOutlined from '@mui/icons-material/ArchiveOutlined';
import CloseRounded from '@mui/icons-material/CloseRounded';
import { STATE_ORDER, STATES } from '../words';
import DateChip from './DateChip';
import FilterChip, { chipSx } from './FilterChip';
import SortMenu from './SortMenu';
import { archivedView, hasFilters } from './filters';
import { LIBRARY } from './words';

const byName = (a, b) => a.label.localeCompare(b.label, 'en-GB', { numeric: true, sensitivity: 'base' });
const TYPES = [
  { value: 'live', label: LIBRARY.live },
  { value: 'homework', label: LIBRARY.homework },
];

// The Archived chip (R11; design.md §3.10): "Archived (3)" with its icon, a toggle; while on, accent tint and
// "Archived ×", whose × also turns it off.
function ArchivedChip({ on, count, onChange }) {
  const set = chipSx(on);
  return (
    <Chip
      icon={<ArchiveOutlined />}
      label={on ? LIBRARY.archivedChip : LIBRARY.archivedChipCount(count ?? 0)}
      onClick={() => onChange(!on)}
      onDelete={on ? () => onChange(false) : undefined}
      deleteIcon={<CloseRounded titleAccess={LIBRARY.clearChip(LIBRARY.archivedChip)} />}
      aria-pressed={on}
      sx={{
        ...set,
        fontVariantNumeric: 'tabular-nums',
        '& .MuiChip-icon': { color: 'inherit', fontSize: 18, ml: 1.25, mr: -0.5 },
        '& .MuiChip-label': { pl: 1, pr: on ? 1 : 1.5 },
      }}
    />
  );
}

// filters, update, clear: the list's (useLibraryFilters); counts: the API's state counts; classes: the teacher's
// classes; tags: their quiz tags; count: the count's words; layout: the table's; onManageTags: opens Manage tags.
export default function Filters({ filters, update, clear, counts, classes, tags, count, layout, onManageTags }) {
  const classOptions = useMemo(
    () => (classes || []).map((item) => ({ value: String(item.id), label: item.name })).sort(byName),
    [classes]
  );
  const tagOptions = (tags || []).map((tag) => ({ value: String(tag.id), label: tag.name, count: tag.quiz_count }));
  const statusOptions = STATE_ORDER.filter((state) => state !== 'archived').map((state) => ({
    value: state,
    label: STATES[state].label,
    count: counts?.[state] ?? 0,
  }));
  const archived = archivedView(filters);
  // "Clear filters" is for the other filters: the Archived chip turns itself off.
  const others = hasFilters({ ...filters, status: archived ? [] : filters.status });

  return (
    <Box
      role="toolbar"
      aria-label={LIBRARY.filters}
      sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, minHeight: 40, mb: 1 }}
    >
      <FilterChip
        label={LIBRARY.classChip}
        options={classOptions}
        value={filters.classIds}
        onChange={(classIds) => update({ classIds })}
        searchLabel={LIBRARY.findClass}
        emptyText={LIBRARY.noClasses}
      />
      <DateChip filters={filters} onChange={update} />
      {archived ? null : (
        <FilterChip
          label={LIBRARY.statusChip}
          options={statusOptions}
          value={filters.status}
          onChange={(status) => update({ status })}
        />
      )}
      <FilterChip
        label={LIBRARY.tagChip}
        options={tagOptions}
        value={filters.tagIds}
        onChange={(tagIds) => update({ tagIds })}
        searchLabel={LIBRARY.findTag}
        emptyText={LIBRARY.noTags}
        footer={
          onManageTags
            ? (close) => (
                <MenuItem
                  onClick={() => {
                    close();
                    onManageTags();
                  }}
                >
                  {LIBRARY.manageTags}
                </MenuItem>
              )
            : undefined
        }
      />
      <FilterChip
        label={LIBRARY.typeChip}
        options={TYPES}
        value={filters.type ? [filters.type] : []}
        onChange={([type = '']) => update({ type })}
        multiple={false}
      />
      {others ? (
        <Button size="small" onClick={clear}>
          {LIBRARY.clearFilters}
        </Button>
      ) : null}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
        {layout === 'wide' ? null : (
          <SortMenu sort={filters.sort} order={filters.order} onSort={(sort) => update({ sort, order: '' })} />
        )}
        <ArchivedChip
          on={archived}
          count={counts?.archived}
          onChange={(on) => update({ status: on ? ['archived'] : [] })}
        />
        <Typography
          aria-live="polite"
          sx={{ fontSize: 14, color: 'var(--mst-ink-2)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}
        >
          {count}
        </Typography>
      </Box>
    </Box>
  );
}
