// The phone shell, below 900 px (Phase 1.38 design §1.4): a glass top bar with the child switcher and the account,
// and a floating glass tab bar of four sections, clear of the home indicator, hidden while the chat's input has focus.
// Area: family

import { IconButton } from '@mui/material';
import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined';
import { Link, useLocation } from 'react-router-dom';
import AccountMenu from '../../../components/common/AccountMenu';
import { useAuth } from '../../../hooks/useAuth';
import { familyPath } from '../familyPaths';
import { SECTIONS, sectionOf } from '../sections';

export function PhoneTopBar({ switcher }) {
  const { user } = useAuth();
  const name = user?.fullName || user?.full_name || user?.email || 'Your account';
  return (
    <header className="fam-phone-top">
      <div className="fam-phone-switcher">{switcher}</div>
      {/* Teacher's account menu, unchanged. Its trigger is an account icon, never an initial a child's could match. */}
      <AccountMenu
        renderButton={(props) => (
          <IconButton className="fam-phone-account" aria-label={`Account: ${name}`} {...props}>
            <AccountCircleOutlined aria-hidden />
          </IconButton>
        )}
      />
    </header>
  );
}

/** `dots` names the tabs with new items. A group's tab is current on its group's sections ([HIG: Tab bars]). */
export function PhoneBottomBar({ childId, dots = {} }) {
  const current = sectionOf(useLocation().pathname);
  const items = SECTIONS.filter((section) => section.phone);
  return (
    <nav className="fam-tabbar fam-phone-bottom" aria-label="Sections" data-mst="family-bottom">
      {items.map((section) => {
        const on = section.id === current.id || section.id === current.group;
        const Icon = section.icon;
        return (
          <Link
            key={section.id}
            to={familyPath(childId, section.segment)}
            className="fam-tab"
            aria-current={on ? 'page' : undefined}
            data-mst={`family-bar-${section.id}`}
          >
            <span className="fam-tab-pill">
              <Icon aria-hidden />
              {dots[section.id] && <span className="fam-tab-dot" aria-hidden />}
            </span>
            <span className="fam-tab-label">{section.label}</span>
            {dots[section.id] && <span className="fam-sr">, new items</span>}
          </Link>
        );
      })}
    </nav>
  );
}
