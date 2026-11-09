// Home, the first page for a child (Phase 1.38 design §2.3, D4): the greeting, Get started for a new parent (the
// sidebar's own places, until Hide), the child's latest homework checks and activities, and How parent mode works.
// Area: family

import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { Button, useMediaQuery } from '@mui/material';
import ChevronRightRounded from '@mui/icons-material/ChevronRightRounded';
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded';
import { Link, useLocation, useOutletContext } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { sessionGeneration } from '../../../services/queryCache';
import { familyApi, familyKeys } from '../familyApi';
import { familyPath } from '../familyPaths';
import ActivityRow from '../lists/ActivityRow';
import useFinishedRows, { pollWhileMaking } from '../lists/useFinishedRows';
import { SECTIONS, resultPath } from '../sections';
import FamilyPage from '../shell/FamilyPage';
import { LATEST, greeting, latestItems, readHidden, writeHidden } from './home';
import './home.css';

// Get started's three ways, in the sidebar's order, with its own icons and names (design §2.3).
const WAYS = [
  ['notebook', (name) => `Ask about anything ${name} is learning. AI answers step by step, so you can help.`],
  ['homework', () => 'Take a photo of finished homework. AI marks it in about a minute and explains any mistakes.'],
  [
    'activities',
    // A tester found the sidebar's Activities "just a faint heading", so the sentence says where they are.
    (name, computer) =>
      `Quizzes, flashcards, mind maps and stories that AI makes for ${name}. They’re listed under Activities ${
        computer ? 'on the left' : 'at the bottom'
      }.`,
  ],
].map(([id, text]) => ({ ...SECTIONS.find((section) => section.id === id), text }));

export default function HomePage() {
  const { child, announce, marks } = useOutletContext();
  const { user } = useAuth();
  const generation = sessionGeneration();
  const name = child.displayName;
  const listKey = familyKeys.activities(generation, user?.id, child.id, { limit: LATEST });
  const list = useQuery({
    queryKey: listKey,
    queryFn: ({ signal }) => familyApi.listActivities(child.id, { limit: LATEST }, { signal }),
    enabled: !!user?.id,
    refetchInterval: (query) => pollWhileMaking(query.state.data?.items),
  });
  useFinishedRows(list.data?.items, listKey, announce);
  const latest = latestItems(list.data?.items);
  // Nothing yet: no homework check or activity, so Get started shows. A chat alone doesn't hide it (the Manager, 20:11).
  const nothing = !!list.data && !latest.length;
  const [hidden, setHidden] = useState(() => readHidden(user?.id, child.id));
  const [asked, setAsked] = useState(false);
  useEffect(() => {
    setHidden(readHidden(user?.id, child.id));
    setAsked(false);
  }, [user?.id, child.id]);
  const guide = useRef(null);
  useEffect(() => {
    if (asked) guide.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [asked]);
  const showGuide = asked || (nothing && !hidden);
  const firstName = (user?.fullName || user?.full_name || '').trim().split(/\s+/)[0];
  return (
    <FamilyPage
      section="Home"
      title={greeting(new Date(), firstName)}
      subtitle={latest.length ? `Here’s what’s new with ${name}.` : `Let’s get started with ${name}.`}
      className="fam-home"
    >
      {showGuide && (
        <GetStarted
          ref={guide}
          child={child}
          onHide={() => {
            writeHidden(user?.id, child.id);
            setHidden(true);
            setAsked(false);
          }}
        />
      )}
      {(latest.length > 0 || !showGuide) && <Latest child={child} list={list} items={latest} marks={marks} />}
      <button type="button" className="fam-home-help" onClick={() => setAsked(true)} data-mst="family-home-help">
        <HelpOutlineRounded aria-hidden />
        How parent mode works
      </button>
    </FamilyPage>
  );
}

// Get started (design §2.3, [HIG: Onboarding]): quick, taught through the real places, skippable and easy to find again.
const GetStarted = forwardRef(function GetStarted({ child, onHide }, ref) {
  const heading = useId();
  const computer = useMediaQuery('(min-width:900px)');
  const name = child.displayName;
  return (
    <section
      ref={ref}
      className="mst-g1 mst-rim home-recent fam-list-card fam-card"
      aria-labelledby={heading}
      data-mst="family-get-started"
    >
      <div className="fam-card-head">
        <h2 id={heading} className="fam-card-title">
          Get started
        </h2>
        <Button variant="text" className="fam-card-action" onClick={onHide} data-mst="family-get-started-hide">
          Hide
        </Button>
      </div>
      <p className="fam-card-lead">
        Three ways to help {name}. You’ll also find each one{' '}
        {computer ? 'in the list on the left' : 'in the bar at the bottom'}.
      </p>
      <ul className="mst-list">
        {WAYS.map((way) => {
          const Icon = way.icon;
          return (
            <li key={way.id}>
              <Link
                className="mst-list-row home-row-button fam-list-link fam-home-row"
                to={familyPath(child.id, way.segment)}
                data-mst={`family-way-${way.id}`}
              >
                <span className="mst-tile" data-size="sm" aria-hidden>
                  <Icon />
                </span>
                <span className="mst-list-text">
                  <span className="mst-list-title">{way.label}</span>
                  <span className="fam-home-sentence">{way.text(name, computer)}</span>
                </span>
                <ChevronRightRounded className="fam-home-chev" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
});

// "Sam's latest" (design §2.3): up to six homework checks and activities, newest first, in the mixed list's rows.
function Latest({ child, list, items, marks }) {
  const heading = useId();
  const { pathname } = useLocation();
  const name = child.displayName;
  let body;
  if (list.isPending)
    body = (
      <div className="fam-card-wait" aria-hidden>
        <span className="fam-skel" />
        <span className="fam-skel" />
      </div>
    );
  else if (!list.data)
    body = (
      <p className="fam-card-empty">
        Could not load {name}’s latest work.{' '}
        <Button onClick={() => list.refetch()} data-mst="family-latest-retry">
          Try again
        </Button>
      </p>
    );
  else if (!items.length)
    body = <p className="fam-card-empty">{name}’s newest homework, quizzes and activities will show here.</p>;
  else
    body = (
      <ul className="mst-list">
        {items.map((item) => (
          <li key={item.id}>
            <ActivityRow
              item={item}
              showKind
              isNew={!!marks?.isNew(item.id)}
              to={resultPath(child.id, item)}
              from={pathname}
            />
          </li>
        ))}
      </ul>
    );
  return (
    <section
      className="mst-g1 mst-rim home-recent fam-list-card fam-card"
      aria-labelledby={heading}
      aria-busy={list.isPending}
    >
      <div className="fam-card-head">
        <h2 id={heading} className="fam-card-title">
          {name}’s latest
        </h2>
        <Link className="fam-card-link" to={familyPath(child.id, 'profile')} data-mst="family-home-profile">
          {name}’s profile
          <ChevronRightRounded aria-hidden />
        </Link>
      </div>
      {body}
    </section>
  );
}
