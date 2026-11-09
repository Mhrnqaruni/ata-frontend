// The side panel, from 900 px (Phase 1.38 design §1.3): teacher mode's floating glass sidebar, with its classes,
// collapse and gradient indicator, holding the child switcher, parent mode's sections and the account row.
// Area: family

import { useLayoutEffect, useRef, useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import ChevronLeftRounded from '@mui/icons-material/ChevronLeftRounded';
import { Link, useLocation } from 'react-router-dom';
import AccountMenu from '../../../components/common/AccountMenu';
import logo from '../../../assets/mst_logo_no_bg.png';
import { useAuth } from '../../../hooks/useAuth';
import { familyPath } from '../familyPaths';
import { GROUPS, SECTIONS, sectionOf } from '../sections';

// The star teacher's collapsed sidebar shows in place of the logo, filled by the shell's #mst-ai-grad.
const STAR =
  'M12 1.8c.6 4.9 2.6 7.6 9.4 10.2-6.8 2.6-8.8 5.3-9.4 10.2-.6-4.9-2.6-7.6-9.4-10.2C9.4 9.4 11.4 6.7 12 1.8Z';

/** `dots` counts each section's new items (design §1.3: a "1 new" chip, or a dot when collapsed). */
export default function SidePanel({ switcher, childId, dots = {}, collapsed, onToggleCollapse }) {
  const { pathname } = useLocation();
  const current = sectionOf(pathname);
  const nav = useRef(null);
  const [indicator, setIndicator] = useState(null);
  // As teacher's: the gradient bar follows the current item, read once per page change or collapse.
  useLayoutEffect(() => {
    const active = nav.current?.querySelector('[aria-current="page"]');
    setIndicator(active ? active.offsetTop + active.offsetHeight / 2 - 10 : null);
  }, [pathname, collapsed]);
  const { user } = useAuth();
  const name = user?.fullName || user?.full_name || user?.email || 'Your account';

  const item = (section) => {
    const on = section.id === current.id;
    const Icon = section.icon;
    const count = dots[section.id] || 0;
    const fresh = count > 0;
    const told = `, ${count} new item${count === 1 ? '' : 's'}`;
    const link = (
      <Link
        key={section.id}
        to={familyPath(childId, section.segment)}
        className="mst-side-item fam-side-item"
        aria-current={on ? 'page' : undefined}
        aria-label={collapsed ? `${section.label}${fresh ? told : ''}` : undefined}
        data-mst={`family-nav-${section.id}`}
      >
        <Icon className="mst-side-icon" aria-hidden />
        <span className="mst-side-text">{section.label}</span>
        {fresh && (
          <>
            <span className="fam-new-chip" aria-hidden>
              {count} new
            </span>
            <span className="fam-sr">{told}</span>
          </>
        )}
      </Link>
    );
    return collapsed ? (
      <Tooltip key={section.id} placement="right" title={section.label}>
        {link}
      </Tooltip>
    ) : (
      link
    );
  };
  // The Activities page is the phone's way in; here its group's label leads the group instead.
  const groups = [
    { id: 'main', label: null, items: SECTIONS.filter((s) => !s.group && s.panel !== false) },
    ...Object.entries(GROUPS).map(([id, label]) => ({ id, label, items: SECTIONS.filter((s) => s.group === id) })),
  ];

  return (
    <div className="mst-side fam-side" data-collapsed={collapsed ? 'true' : 'false'}>
      <div className="mst-side-top">
        {collapsed ? (
          <span aria-hidden="true" className="mst-side-star">
            <svg viewBox="0 0 24 24">
              <path d={STAR} fill="url(#mst-ai-grad)" />
            </svg>
          </span>
        ) : (
          <img alt="MySmartTeach" className="mst-side-logo" src={logo} />
        )}
        <Tooltip placement="right" title={collapsed ? 'Expand navigation' : 'Collapse navigation'}>
          <IconButton
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            className="mst-side-collapse"
            data-mst="family-sidebar-collapse"
            onClick={onToggleCollapse}
          >
            <ChevronLeftRounded />
          </IconButton>
        </Tooltip>
      </div>
      <div className="fam-side-switcher">{switcher}</div>
      <nav aria-label="Parent mode sections" className="mst-side-nav" data-mst="family-sidebar" ref={nav}>
        {indicator !== null && (
          <span aria-hidden="true" className="mst-side-indicator" style={{ transform: `translateY(${indicator}px)` }} />
        )}
        {groups.map((group) => (
          <div className="mst-side-group" key={group.id}>
            {group.label &&
              (collapsed ? (
                <span aria-hidden="true" className="mst-side-rule" />
              ) : (
                <div className="mst-side-label">{group.label}</div>
              ))}
            {group.items.map(item)}
          </div>
        ))}
      </nav>
      <div className="mst-side-bottom">
        {/* Teacher's account menu, unchanged; its trigger is teacher's account row, which says "Parent" here. */}
        <AccountMenu
          renderButton={(props) => (
            <button type="button" className="mst-side-user fam-side-user" aria-label={`Account: ${name}`} {...props}>
              <span className="mst-avatar" aria-hidden>
                {name.trim().charAt(0).toUpperCase() || '?'}
              </span>
              <span className="mst-side-user-text">
                <span className="mst-side-user-name">{name}</span>
                <span className="mst-side-user-role">Parent</span>
              </span>
            </button>
          )}
        />
      </div>
    </div>
  );
}
