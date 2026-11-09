// The child switcher (Phase 1.38 design §1.3–1.4): a row in teacher's look naming the current child, whose menu
// lists the children, the child's profile and Add a child. Below 600 px the menu is a bottom sheet.
// Area: family

import { useRef, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  Divider,
  ListItemIcon,
  Menu,
  MenuItem,
  MenuList,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import AddRounded from '@mui/icons-material/AddRounded';
import BadgeOutlined from '@mui/icons-material/BadgeOutlined';
import CheckRounded from '@mui/icons-material/CheckRounded';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import ChildAvatar from '../ChildAvatar';
import { familyPath, segmentOf, switchPath } from '../familyPaths';
import useDialogParam from '../useDialogParam';

const yearOf = (child) => child?.gradeLevel || 'Year not set';

/**
 * `children` are the active children in the order they were added; `child` is the address's child, or null.
 * `compact` is the phone's top-bar form; `collapsed` the collapsed sidebar's, the avatar alone.
 */
export default function ChildSwitcher({ children, child, loading, compact, collapsed }) {
  const [anchor, setAnchor] = useState(null);
  const button = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [, showAdd] = useDialogParam('add-child');
  // Popovers are for wide views; a phone gets the same items in a sheet (design §1.3, [HIG: Popovers]).
  const sheet = useMediaQuery('(max-width:599px)');
  const close = () => {
    setAnchor(null);
    button.current?.focus();
  };
  const go = (to) => {
    close();
    navigate(to);
  };
  if (loading)
    return (
      <div className="fam-switcher" data-compact={compact} data-collapsed={collapsed} aria-hidden>
        <span className="fam-skel fam-skel-circle" />
        {!collapsed && (
          <span className="fam-switcher-text">
            <span className="fam-skel fam-skel-line" />
          </span>
        )}
      </div>
    );
  const label = child ? `Current child: ${child.displayName}, ${yearOf(child)}. Change child` : 'Choose a child';
  const trigger = (
    <button
      ref={button}
      type="button"
      className="fam-switcher"
      data-compact={compact}
      data-collapsed={collapsed}
      data-current={segmentOf(pathname) === 'profile'}
      aria-haspopup="menu"
      aria-expanded={!!anchor}
      aria-label={label}
      onClick={(e) => setAnchor(e.currentTarget)}
      data-mst="family-switcher"
    >
      {child ? <ChildAvatar child={child} size={32} /> : <span className="fam-avatar fam-avatar-none" />}
      {!collapsed && (
        <span className="fam-switcher-text">
          <span className="fam-switcher-name">{child ? child.displayName : 'Choose a child'}</span>
          {/* The no-break space keeps its gap in the flex line, as "Sam · Year 4". */}
          {child &&
            (compact ? (
              <span className="fam-switcher-year">&nbsp;· {yearOf(child)}</span>
            ) : (
              <span className="fam-switcher-year">{yearOf(child)}</span>
            ))}
        </span>
      )}
      {/* A down chevron reads as a drop-down (design §1.3). */}
      {!collapsed && <ExpandMoreRounded className="fam-chev" aria-hidden />}
    </button>
  );
  const items = [
    ...children.map((item) => {
      const on = item.id === child?.id;
      return (
        <MenuItem
          key={item.id}
          role="menuitemradio"
          aria-checked={on}
          selected={on}
          className="fam-switcher-child"
          onClick={() => (on ? close() : go(switchPath(pathname, item.id)))}
        >
          <ChildAvatar child={item} size={32} />
          <span className="fam-switcher-text">
            <span className="fam-switcher-name">{item.displayName}</span>
            <span className="fam-switcher-year">{yearOf(item)}</span>
          </span>
          {on && <CheckRounded className="fam-switcher-check" aria-hidden />}
        </MenuItem>
      );
    }),
    children.length > 0 && <Divider key="divider" />,
    child && (
      <MenuItem key="profile" onClick={() => go(familyPath(child.id, 'profile'))} data-mst="family-child-profile">
        <ListItemIcon>
          <BadgeOutlined />
        </ListItemIcon>
        {child.displayName}’s profile
      </MenuItem>
    ),
    <MenuItem
      key="add"
      className="fam-switcher-add"
      onClick={() => {
        setAnchor(null);
        showAdd();
      }}
      data-mst="family-add-child"
    >
      <ListItemIcon>
        <AddRounded />
      </ListItemIcon>
      Add a child
    </MenuItem>,
  ].filter(Boolean);
  return (
    <>
      {collapsed && child ? (
        <Tooltip placement="right" title={`${child.displayName}, ${yearOf(child)}`}>
          {trigger}
        </Tooltip>
      ) : (
        trigger
      )}
      {sheet ? (
        <Dialog open={!!anchor} onClose={close} fullWidth className="fam-sheet" aria-labelledby="fam-child-sheet">
          <DialogTitle id="fam-child-sheet">Choose a child</DialogTitle>
          <MenuList autoFocusItem aria-label="Your children" className="fam-sheet-list">
            {items}
          </MenuList>
        </Dialog>
      ) : (
        <Menu
          open={!!anchor}
          anchorEl={anchor}
          onClose={close}
          className="fam-switcher-menu"
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          MenuListProps={{ 'aria-label': 'Your children' }}
        >
          {items}
        </Menu>
      )}
    </>
  );
}
