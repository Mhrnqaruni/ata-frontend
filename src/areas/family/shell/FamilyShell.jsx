// Parent mode's shell (Phase 1.38 design §1.3–1.4): teacher's sidebar from 900 px, the phone's glass top bar and tab bar
// below it, the skip link and the live region that announces a switch. A child's pages show in its main area.
// Area: family

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Button, useMediaQuery } from '@mui/material';
import { Link, Outlet, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../hooks/useAuth';
import { sessionGeneration } from '../../../services/queryCache';
import { familyApi, familyKeys } from '../familyApi';
import { familyPath } from '../familyPaths';
import ChildAvatar from '../ChildAvatar';
import FamilyLoading from '../FamilyLoading';
import ChildDialogs from '../child/ChildDialogs';
import UploadDialog from '../make/UploadDialog';
import { newDots } from '../newMarks';
import { SECTIONS } from '../sections';
import useNewMarks from '../useNewMarks';
import ChildSwitcher from './ChildSwitcher';
import SidePanel from './SidePanel';
import { PhoneBottomBar, PhoneTopBar } from './PhoneBars';
import './shell.css';

// Teacher's remembered choice (its Layout's key), so the sidebar collapses alike in both modes.
const COLLAPSE_KEY = 'mst.nav.collapsed';
function useCollapsed() {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const toggle = () =>
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? '0' : '1');
      } catch {
        /* The choice just isn't remembered. */
      }
      return !value;
    });
  return [collapsed, toggle];
}

// Added to words said twice in a row, so the live region still changes and screen readers say them again.
const NO_BREAK_SPACE = String.fromCharCode(160);

/**
 * The pages get { child, children, announce, marks } from the shell's outlet context. announce(text) says a status
 * change in the live region, such as a row that finished (C-19); marks are the child's "new" marks (useNewMarks).
 */
export default function FamilyShell() {
  const { user } = useAuth();
  const { child_id: childId } = useParams();
  const computer = useMediaQuery('(min-width:900px)');
  const [collapsed, toggleCollapsed] = useCollapsed();
  const children = useQuery({
    queryKey: familyKeys.children(sessionGeneration(), user?.id),
    enabled: !!user?.id,
    queryFn: ({ signal }) => familyApi.children({ signal }),
  });
  const rows = children.data?.filter((item) => item.isActive !== false) || [];
  const child = rows.find((item) => item.id === childId) || null;
  // The "new" marks, read once here for the panel's and the phone bar's dots and for every page (design §3.12).
  const marks = useNewMarks(child?.id);
  const dots = newDots(marks.counts, SECTIONS);
  const [announcement, setAnnouncement] = useState('');
  const announce = useCallback(
    (text) => setAnnouncement((previous) => (previous === text ? text + NO_BREAK_SPACE : text)),
    []
  );
  const shown = useRef('');
  const childName = child?.displayName;
  // "Showing Alex" after any change of child: the switcher, the Child page's Switch, or Back (WCAG 4.1.3).
  useEffect(() => {
    if (!childName) return;
    if (shown.current && shown.current !== childId) setAnnouncement(`Showing ${childName}`);
    shown.current = childId;
  }, [childId, childName]);
  const switcher = (
    <ChildSwitcher
      children={rows}
      child={child}
      loading={children.isPending}
      compact={!computer}
      collapsed={computer && collapsed}
    />
  );
  let content;
  if (children.isError)
    content = (
      <p className="fam-shell-message" role="alert">
        Could not load your children. <Button onClick={() => children.refetch()}>Try again</Button>
      </p>
    );
  else if (children.isPending) content = <FamilyLoading variant="body" label="Loading" />;
  else if (!child) content = <UnknownChild children={rows} />;
  else
    content = (
      // A page's code loads inside the main area, so the panel and bars stay in place.
      <Suspense fallback={<FamilyLoading variant="body" label="Loading" />}>
        <Outlet context={{ child, children: rows, announce, marks }} />
      </Suspense>
    );
  return (
    <div className="fam-shell" data-phone={!computer} data-collapsed={computer && collapsed}>
      {/* As teacher's Layout: one gradient for the current item's icon and the collapsed star. */}
      <svg aria-hidden="true" focusable="false" height="0" width="0" className="fam-defs">
        <defs>
          <linearGradient id="mst-ai-grad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="var(--mst-ai-a)" />
            <stop offset="1" stopColor="var(--mst-ai-b)" />
          </linearGradient>
        </defs>
      </svg>
      <a className="fam-skip" href="#family-main">
        Skip to main content
      </a>
      {computer ? (
        <aside className="fam-side-col" aria-label="Main navigation">
          <SidePanel
            switcher={switcher}
            childId={childId}
            dots={dots}
            collapsed={collapsed}
            onToggleCollapse={toggleCollapsed}
          />
        </aside>
      ) : (
        <PhoneTopBar switcher={switcher} />
      )}
      <main id="family-main" className="fam-shell-main" tabIndex={-1}>
        {content}
      </main>
      {!computer && <PhoneBottomBar childId={childId} dots={dots} />}
      <ChildDialogs child={child} children={rows} />
      {/* Check homework, uploads and Add the missing pages, from ?dialog=check, upload or add-pages (S3.4). */}
      {child && <UploadDialog child={child} />}
      <div className="fam-sr" role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}

/** An archived, unknown or other parent's child (design §4): the same words for each, and the parent's children. */
function UnknownChild({ children }) {
  return (
    <div className="fam-shell-message">
      <p role="alert">That child isn’t available. Choose one of your children.</p>
      <ul className="fam-shell-children">
        {children.map((item) => (
          <li key={item.id}>
            <Link to={familyPath(item.id)} className="fam-shell-child">
              <ChildAvatar child={item} size={32} />
              {item.displayName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
