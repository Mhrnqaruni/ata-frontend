// One list page for Homework and the four Activities sections (design §1.5–1.7, §5.3, §6.2; C-4, C-11, C-14, C-21):
// the title row's words and action, the items in one card, 20 at a time with Show more, the empty state and "‹ Activities".
// Area: family

import { useMemo, useRef, useState } from 'react';
import { Button } from '@mui/material';
import AutoAwesomeRounded from '@mui/icons-material/AutoAwesomeRounded';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import PhotoCameraOutlined from '@mui/icons-material/PhotoCameraOutlined';
import WifiOffRounded from '@mui/icons-material/WifiOffRounded';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import EmptyState from '../../../components/common/EmptyState';
import { useAuth } from '../../../hooks/useAuth';
import { queryClient, sessionGeneration } from '../../../services/queryCache';
import { familyApi, familyKeys } from '../familyApi';
import { familyError } from '../familyErrors';
import { familyPath } from '../familyPaths';
import { SECTIONS, resultPath } from '../sections';
import MakeDialog from '../make/MakeDialog';
import { checkRequest } from '../make/UploadDialog';
import FamilyPage from '../shell/FamilyPage';
import useDialogParam, { useOpenDialog } from '../useDialogParam';
import ActivityRow, { UnmarkedRow } from './ActivityRow';
import { KIND_ICONS, PAGE_WORDS } from './listWords';
import { unmarkedUploads, withUploads } from './unmarked';
import useFinishedRows, { pollWhileMaking } from './useFinishedRows';
import './lists.css';

const PAGE = 20; // rows a page, then Show more (C-4)

/** `section` is a list section's id in sections.js: homework, quizzes, flashcards, mind-maps or stories. */
export default function SectionListPage({ section: id }) {
  const section = SECTIONS.find((item) => item.id === id);
  const words = PAGE_WORDS[section.id];
  const homework = section.id === 'homework';
  const { child, announce, marks } = useOutletContext();
  const userId = useAuth().user?.id;
  const location = useLocation();
  const generation = sessionGeneration();
  const filter = { kind: section.kind, limit: PAGE };
  const key = familyKeys.activities(generation, userId, child.id, filter);
  // Pages refetch in order from the first, so a poll never reads an old cursor (React Query's infinite queries).
  const list = useInfiniteQuery({
    queryKey: key,
    queryFn: ({ pageParam, signal }) =>
      familyApi.listActivities(child.id, { ...filter, before: pageParam }, { signal }),
    initialPageParam: undefined,
    getNextPageParam: (page) => page.nextCursor,
    refetchInterval: (query) => pollWhileMaking(query.state.data?.pages.flatMap((page) => page.items)),
    enabled: Boolean(userId),
  });
  const items = useMemo(() => list.data?.pages.flatMap((page) => page.items), [list.data]);
  useFinishedRows(items, key, announce);
  // Homework's saved-but-not-marked rows come from the notebook home, under its own key and without polling it (C-10).
  const home = useQuery({
    queryKey: familyKeys.home(generation, userId, child.id),
    queryFn: ({ signal }) => familyApi.home(child.id, { signal }),
    enabled: homework && Boolean(userId),
  });
  const unmarked = homework ? unmarkedUploads(home.data) : [];
  const openDialog = useOpenDialog();
  const heading = useRef(null);
  // Check now: today's check call on the saved photos (C-21). The parent stays here, and the photos come back at the
  // top of Past checks as "Marking… about a minute" (design §5.3), so focus goes on from the list's heading.
  const [marking, setMarking] = useState('');
  const [markError, setMarkError] = useState('');
  const checkIds = useRef({}); // a retry reuses its check's id, so it never makes two
  async function mark(material) {
    if (marking) return;
    setMarking(material.id);
    setMarkError('');
    checkIds.current[material.id] ??= crypto.randomUUID();
    try {
      await familyApi.startActivity(child.id, checkIds.current[material.id], checkRequest(material.id));
      await queryClient.invalidateQueries({
        queryKey: familyKeys.child(generation, userId, child.id),
        predicate: ({ queryKey }) => ['home', 'activities'].includes(queryKey[4]),
      });
      announce?.('Sent for marking. It takes about a minute.');
      heading.current?.focus();
    } catch (e) {
      setMarkError(familyError(e, 'This could not finish. Your saved work is safe.'));
    } finally {
      setMarking('');
    }
  }
  // Each section's main action, an AI action in teacher's gradient (design §1.5): an activity section makes its kind
  // (?dialog=make-<kind>, C-14); Homework checks homework (?dialog=check, the shell's upload dialog), with a camera.
  const [, showMake] = useDialogParam(`make-${section.kind}`);
  const [, showCheck] = useDialogParam('check');
  const action = (
    <Button
      variant="contained"
      className="mst-ai"
      startIcon={section.make ? <AutoAwesomeRounded /> : <PhotoCameraOutlined />}
      onClick={section.make ? showMake : showCheck}
      data-mst={section.make ? `family-section-make-${section.kind}` : 'family-check-homework'}
    >
      {section.make || 'Check homework'}
    </Button>
  );
  // Homework's card is headed "Past checks" (design §5.3); a kind's page title already names its list.
  const head = homework && (
    <header className="fam-list-head">
      <h2 ref={heading} tabIndex={-1} className="mst-card-title">
        Past checks
      </h2>
    </header>
  );

  const empty = Boolean(items) && !items.length && !unmarked.length;
  let body;
  if (!items && list.isError) {
    // A quiet notice in the page column, not an empty page (design §10.7).
    body = (
      <div className="fam-list-notice" role="alert">
        <WifiOffRounded aria-hidden />
        <p>
          {child.displayName}’s {section.label.toLowerCase()} couldn’t load just now. They’re safe. Try again in a
          moment.
        </p>
        <Button variant="outlined" onClick={() => list.refetch()} data-mst="family-list-retry">
          Try again
        </Button>
      </div>
    );
  } else if (!items) {
    body = (
      <div className="mst-g1 mst-rim home-recent fam-list-card">
        {head}
        <div className="fam-list-wait" aria-hidden>
          {[0, 1, 2, 3].map((row) => (
            <span key={row} className="fam-skel" />
          ))}
        </div>
      </div>
    );
  } else if (empty) {
    // No button: the title row already holds the page's main action (design §1.7).
    const Icon = homework ? PhotoCameraOutlined : KIND_ICONS[section.kind];
    body = (
      <EmptyState icon={<Icon />} title={words.emptyTitle}>
        {words.empty(child.displayName)}
      </EmptyState>
    );
  } else {
    // Newest first, with Homework's saved photos among the checks by date (design §5.3).
    const rows = homework ? withUploads(items, unmarked) : items.map((item) => ({ item }));
    body = (
      <>
        <div className="mst-g1 mst-rim home-recent fam-list-card">
          {head}
          <ul className="mst-list">
            {rows.map(({ item, upload }) =>
              upload ? (
                <UnmarkedRow
                  key={upload.id}
                  material={upload}
                  onMark={mark}
                  busy={Boolean(marking)}
                  sending={marking === upload.id}
                />
              ) : (
                <ActivityRow
                  key={item.id}
                  item={item}
                  to={resultPath(child.id, item)}
                  from={location.pathname}
                  isNew={marks?.isNew(item.id)}
                  // Today's "Add the missing pages", from ?dialog=add-pages with the check in its history entry.
                  onAddPages={
                    homework ? (row) => openDialog('add-pages', { addPages: { activityId: row.id } }) : undefined
                  }
                />
              )
            )}
          </ul>
        </div>
        {list.hasNextPage && (
          <Button
            variant="outlined"
            className="fam-list-more"
            disabled={list.isFetchingNextPage}
            onClick={() => list.fetchNextPage()}
            data-mst="family-list-more"
          >
            Show more
          </Button>
        )}
      </>
    );
  }
  return (
    <FamilyPage
      section={section.label}
      title={section.label}
      subtitle={words.subtitle(child.displayName)}
      actions={action}
      className="fam-list-page"
    >
      {section.group === 'activities' && (
        <div className="fam-list-backbar">
          <Link to={familyPath(child.id, 'activities')} className="fam-list-back" data-mst="family-back-activities">
            <ChevronLeftRounded aria-hidden />
            Activities
          </Link>
        </div>
      )}
      <div className="fam-list-body" aria-busy={!items && !list.isError}>
        {markError && (
          <p className="fam-list-error" role="alert">
            {markError}
          </p>
        )}
        {body}
        {list.isError && items && <p className="fam-list-note">Couldn’t refresh. Showing what was saved.</p>}
      </div>
      {section.make && <MakeDialog child={child} mode="section" />}
    </FamilyPage>
  );
}
