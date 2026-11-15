// The quiz list at /quizzes (Phase 1.46 SOT-2 to SOT-5, L14; Phase 1.47 design.md §3.10): search and filters over one
// calm table of the teacher's quizzes, with tags, the Archived view, ticked rows' actions, the ⋯ menu and a first visit.
// Area: quizzes

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Typography } from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import PageHeader from '../../../components/common/PageHeader';
import { useAuth } from '../../../hooks/useAuth';
import { useTeacherData } from '../../../hooks/useTeacherData';
import StartWindow from '../editor/StartWindow';
import BulkBar from './BulkBar';
import EmptyStart from './EmptyStart';
import Filters from './Filters';
import LibraryDialogs from './LibraryDialogs';
import LiveNowStrip from './LiveNowStrip';
import QuizTable from './QuizTable';
import SearchField from './SearchField';
import Toast, { useToast } from './Toast';
import { apiParams, archivedView, hasFilters, sortBy, sortOrder } from './filters';
import { useLibrary, useLibraryTotal, useQuizTags } from './queries';
import { countText, layoutFor, liveToShow, runPath } from './rows';
import { useLibraryActions } from './useLibraryActions';
import { useLibraryFilters } from './useLibraryFilters';
import { useQuizOpeners } from './useQuizOpeners';
import { useSelection } from './useSelection';
import { useWidth } from './useWidth';
import { LIBRARY } from './words';

const HIGHLIGHT_MS = 3000; // a new copy stays outlined this long (design.md §3.1)

// What the table says with no rows: nothing is archived (the Archived view on its own), nothing matches the filters,
// or every quiz is archived. (A teacher with no quiz at all gets the first visit's three ways to start instead.)
function emptyWords({ filtered, onlyArchived, text, onClear, onArchived }) {
  if (onlyArchived) return [LIBRARY.noArchived, LIBRARY.showAll, () => onArchived(false)];
  if (filtered) return [LIBRARY.nothingMatches(text), LIBRARY.clearFilters, onClear];
  return [LIBRARY.allArchived, LIBRARY.showArchived, () => onArchived(true)];
}

function EmptyList(props) {
  const [words, action, onClick] = emptyWords(props);
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
      <Typography sx={{ fontSize: 15 }}>{words}</Typography>
      <Button size="small" variant="outlined" onClick={onClick}>
        {action}
      </Button>
    </Box>
  );
}

export default function LibraryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { filters, update, clear } = useLibraryFilters(user?.id);
  const params = useMemo(() => apiParams(filters), [filters]);
  const library = useLibrary(params);
  const filtered = hasFilters(filters);
  const all = useLibraryTotal(filtered);
  const tags = useQuizTags();
  const classes = useTeacherData('classes');
  const [measure, width] = useWidth();
  const layout = layoutFor(width);
  const { act, startWindow } = useQuizOpeners();
  const [toast, showToast, closeToast] = useToast();
  const actions = useLibraryActions(showToast);
  const [open, setOpen] = useState(null); // the menu or window open: see LibraryDialogs
  const [highlightId, setHighlightId] = useState(null);
  const search = useCallback((q) => update({ q }), [update]);

  const pages = library.data?.pages;
  const first = pages?.[0];
  const rows = useMemo(() => (pages || []).flatMap((page) => page.items), [pages]);
  const total = first?.total ?? 0;
  const selection = useSelection(rows, JSON.stringify(params));
  const chosen = selection.chosen;
  const archived = archivedView(filters);
  const count = countText({ shown: total, all: all.data, filtered, archived });

  useEffect(() => {
    if (!highlightId) return undefined;
    const timer = setTimeout(() => setHighlightId(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [highlightId]);

  // A tag deleted or merged away leaves the Tag filter; a merge puts the tag it joined in its place.
  const tagGone = (tagId, intoId) => {
    if (!filters.tagIds.includes(String(tagId))) return;
    const kept = filters.tagIds.filter((id) => id !== String(tagId));
    update({ tagIds: intoId && !kept.includes(String(intoId)) ? [...kept, String(intoId)] : kept });
  };
  const bulkAction = (action, quizzes) => async () => {
    if (await action(quizzes)) selection.clear();
  };

  // The first visit (L14): no quiz at all, archived or not, so three ways to start and no filters or search. Old rows
  // kept while new filters load never count as empty.
  const firstVisit =
    Boolean(first) && !library.isPlaceholderData && !filtered && total === 0 && !first.counts?.archived;
  if (firstVisit)
    return (
      <Box sx={{ minWidth: 0 }}>
        <PageHeader title={LIBRARY.title} />
        <EmptyStart />
      </Box>
    );

  return (
    // The header sits 12 px above the filter row, not the usual 28: with the search in the header, the two read as one
    // toolbar, and the space is a row of quizzes (design.md §9: 12 rows on a 1366×768 screen).
    <Box ref={measure} sx={{ minWidth: 0, '& .mst-page-head': { mb: '12px' } }}>
      <PageHeader
        title={LIBRARY.title}
        actions={
          <>
            <SearchField value={filters.q} onChange={search} />
            <Button
              size="large"
              variant="contained"
              startIcon={<AddOutlined />}
              onClick={() => navigate('/quizzes/new')}
            >
              {LIBRARY.create}
            </Button>
          </>
        }
      />
      {chosen.length ? (
        <BulkBar
          chosen={chosen}
          busy={actions.busy}
          onTags={(anchor) => setOpen({ kind: 'tags', quizzes: chosen, anchor })}
          onArchive={bulkAction(
            actions.archive,
            chosen.filter((quiz) => !quiz.archived_at)
          )}
          onUnarchive={bulkAction(
            actions.unarchive,
            chosen.filter((quiz) => quiz.archived_at)
          )}
          onDelete={() => setOpen({ kind: 'delete', quizzes: chosen })}
          onClear={selection.clear}
        />
      ) : (
        <Filters
          filters={filters}
          update={update}
          clear={clear}
          counts={first?.counts}
          classes={classes.data}
          tags={tags.data}
          count={first ? count : ''}
          layout={layout}
          onManageTags={() => setOpen({ kind: 'manageTags' })}
        />
      )}
      <LiveNowStrip
        quizzes={liveToShow(first?.live_now, rows)}
        onOpen={(quiz) => navigate(runPath(quiz.open_run))}
        onShowAll={() => update({ status: ['live'] })}
      />
      <QuizTable
        rows={rows}
        layout={layout}
        width={width}
        sort={{ sort: filters.sort, order: sortOrder(filters) }}
        onSort={(key) => update(sortBy(filters, key))}
        state={{
          loading: library.isPending,
          error: library.isError,
          onRetry: () => library.refetch(),
          empty: (
            <EmptyList
              filtered={filtered}
              onlyArchived={archived && !hasFilters({ ...filters, status: [] })}
              text={filters.q.trim()}
              onClear={clear}
              onArchived={(on) => update({ status: on ? ['archived'] : [] })}
            />
          ),
        }}
        rowProps={{ now: new Date(), highlightId, onAction: act, onOpen: navigate }}
        picking={{
          all: selection.all,
          some: selection.some,
          onAll: selection.toggleAll,
          has: selection.has,
          onPick: selection.toggle,
        }}
        onMenu={(anchor, quiz) => setOpen({ kind: 'menu', quizzes: [quiz], anchor })}
      />
      {library.hasNextPage ? (
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, py: 2 }}>
          <Typography sx={{ fontSize: 14, color: 'var(--mst-ink-2)', fontVariantNumeric: 'tabular-nums' }}>
            {LIBRARY.shownOf(rows.length, total)}
          </Typography>
          <Button
            variant="outlined"
            size="small"
            disabled={library.isFetchingNextPage}
            onClick={() => library.fetchNextPage()}
          >
            {LIBRARY.showMore}
          </Button>
        </Box>
      ) : null}
      <LibraryDialogs
        open={open}
        setOpen={setOpen}
        rows={rows}
        tags={tags.data}
        actions={actions}
        onAction={act}
        onCopied={setHighlightId}
        onDeleted={selection.clear}
        onTagGone={tagGone}
        toast={showToast}
      />
      <StartWindow {...startWindow} />
      <Toast toast={toast} onClose={closeToast} />
    </Box>
  );
}
