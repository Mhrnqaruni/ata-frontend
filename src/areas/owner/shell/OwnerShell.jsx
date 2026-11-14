// The admin panel's frame: the sidebar (Admin mark, search, the sections, Access record, the account) and the page.
// It reuses the teacher sidebar's look, with its own navigation and the owner's own session (design §3.0).
// Area: owner

import { Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { IconButton, Tooltip } from '@mui/material';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import SearchRounded from '@mui/icons-material/SearchRounded';
import logo from '../../../assets/mst_logo_no_bg.png';
import { ACCESS_SECTION, OWNER_SECTIONS, isCurrent } from '../sections';
import OwnerAccount from './OwnerAccount';
import useRange from '../useRange';
import '../owner.css';
import '../components/parts.css';

const COLLAPSE_KEY = 'mst.owner.nav.collapsed';

// One nav link: an <a> for the browser's own open-in-new-tab, routed in place on a plain click.
function NavItem({ item, collapsed, keepRange }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const range = useRange();
  // The sections keep the page's range, as links in pages do (§3.13, QA's Section 4 P3-1); Access record has none.
  const to = keepRange ? range.linkTo(item.path) : item.path;
  const Icon = item.icon;
  const link = (
    <a
      aria-current={isCurrent(pathname, item) ? 'page' : undefined}
      aria-label={collapsed ? item.text : undefined}
      className="mst-side-item"
      href={to}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
        event.preventDefault();
        navigate(to);
      }}
    >
      <Icon aria-hidden="true" className="mst-side-icon" />
      <span className="mst-side-text">{item.text}</span>
    </a>
  );
  return collapsed ? (
    <Tooltip placement="right" title={item.text}>
      {link}
    </Tooltip>
  ) : (
    link
  );
}

// The search field: Enter opens the search page; "/" anywhere outside a field puts the cursor here.
function OwnerSearch({ collapsed }) {
  const navigate = useNavigate();
  const field = useRef(null);
  const { pathname } = useLocation();
  const [params] = useSearchParams();
  const [text, setText] = useState('');
  // On the search page the field keeps its search, so it can be changed in place.
  const searched = pathname === '/owner/search' ? params.get('q') || '' : null;
  useEffect(() => {
    if (searched !== null) setText(searched);
  }, [searched]);
  useEffect(() => {
    const onKey = (event) => {
      const target = event.target;
      const typing = target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        field.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
  if (collapsed) {
    return (
      <Tooltip placement="right" title="Search">
        <IconButton aria-label="Search" className="owner-search-icon" onClick={() => navigate('/owner/search')}>
          <SearchRounded />
        </IconButton>
      </Tooltip>
    );
  }
  return (
    <form
      className="owner-search"
      data-mst="owner-search"
      onSubmit={(event) => {
        event.preventDefault();
        if (text.trim()) navigate(`/owner/search?q=${encodeURIComponent(text.trim())}`);
      }}
      role="search"
    >
      <SearchRounded aria-hidden="true" className="owner-search-glyph" />
      <input
        aria-label="Search users, assessments, classes and students"
        maxLength={100}
        onChange={(event) => setText(event.target.value)}
        placeholder="Search"
        ref={field}
        type="search"
        value={text}
      />
      <kbd aria-hidden="true">/</kbd>
    </form>
  );
}

function OwnerSidebar({ collapsed, onToggle }) {
  const { pathname } = useLocation();
  const listRef = useRef(null);
  const [indicator, setIndicator] = useState(null);
  // The accent line follows the current item: one read per page change or collapse, never per frame.
  useLayoutEffect(() => {
    const active = listRef.current?.querySelector('[aria-current="page"]');
    setIndicator(active ? active.offsetTop + active.offsetHeight / 2 - 10 : null);
  }, [pathname, collapsed]);
  return (
    <div className="mst-side" data-collapsed={collapsed ? 'true' : 'false'}>
      <div className="mst-side-top">
        {collapsed ? null : <img alt="MySmartTeach" className="mst-side-logo" src={logo} />}
        <Tooltip placement="right" title={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
          <IconButton
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            className="mst-side-collapse"
            onClick={onToggle}
          >
            <ChevronLeftRounded />
          </IconButton>
        </Tooltip>
      </div>
      <Tooltip placement="right" title={collapsed ? 'Admin' : ''}>
        <span className="owner-mark">
          <AdminPanelSettingsOutlined aria-hidden="true" />
          {collapsed ? null : 'Admin'}
        </span>
      </Tooltip>
      <OwnerSearch collapsed={collapsed} />
      <nav aria-label="Admin" className="mst-side-nav" data-mst="owner-nav" ref={listRef}>
        {indicator !== null ? (
          <span aria-hidden="true" className="mst-side-indicator" style={{ transform: `translateY(${indicator}px)` }} />
        ) : null}
        {OWNER_SECTIONS.map((group) => (
          <div className="mst-side-group" key={group.label || group.items[0].path}>
            {group.label && !collapsed ? <div className="mst-side-label">{group.label}</div> : null}
            {group.label && collapsed ? <span aria-hidden="true" className="mst-side-rule" /> : null}
            {group.items.map((item) => (
              <NavItem collapsed={collapsed} item={item} keepRange key={item.path} />
            ))}
          </div>
        ))}
      </nav>
      <div className="mst-side-bottom">
        <NavItem collapsed={collapsed} item={ACCESS_SECTION} />
        <OwnerAccount collapsed={collapsed} />
      </div>
    </div>
  );
}

export default function OwnerShell() {
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
        /* the choice just isn't remembered */
      }
      return !value;
    });
  return (
    <div className="owner-frame">
      {/* the gradient the current item's icon wears, as in the teacher layout */}
      <svg aria-hidden="true" focusable="false" height="0" style={{ position: 'absolute' }} width="0">
        <defs>
          <linearGradient id="mst-ai-grad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="var(--mst-ai-a)" />
            <stop offset="1" stopColor="var(--mst-ai-b)" />
          </linearGradient>
        </defs>
      </svg>
      <aside className="owner-aside" data-collapsed={collapsed ? 'true' : 'false'}>
        <OwnerSidebar collapsed={collapsed} onToggle={toggle} />
      </aside>
      <main className="owner-main">
        <p className="owner-small-screen" role="note">
          The admin panel is made for a computer screen.
        </p>
        <div className="owner-page">
          {/* each page loads on its own, inside the frame, so the sidebar stays put */}
          <Suspense fallback={<p role="status">Loading page…</p>}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
