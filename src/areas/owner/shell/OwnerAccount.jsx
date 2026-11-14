// The owner's account button at the sidebar's foot: their email, and a menu with Light / Dark and Sign out.
// Area: owner

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Divider, IconButton, ListItemIcon, ListSubheader, Menu, MenuItem, Tooltip } from '@mui/material';
import CheckRounded from '@mui/icons-material/CheckRounded';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined';
import { useThemeMode } from '../../../hooks/useThemeMode';
import { signOut } from '../ownerApi';
import { ownerEmail } from '../ownerSession';

export default function OwnerAccount({ collapsed }) {
  const { mode, toggleThemeMode } = useThemeMode();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const email = ownerEmail() || 'Owner';
  const open = (event) => setAnchor(event.currentTarget);
  const leave = async () => {
    setAnchor(null);
    try {
      await signOut();
    } finally {
      navigate('/owner/sign-in?signed_out=1', { replace: true });
    }
  };
  const trigger = collapsed ? (
    <Tooltip placement="right" title={email}>
      <IconButton aria-haspopup="menu" aria-label={`Account: ${email}`} className="owner-account-icon" onClick={open}>
        <AccountCircleOutlined />
      </IconButton>
    </Tooltip>
  ) : (
    <button aria-haspopup="menu" className="owner-account" data-mst="owner-account" onClick={open} type="button">
      <AccountCircleOutlined aria-hidden="true" />
      <span>{email}</span>
    </button>
  );
  return (
    <>
      {trigger}
      <Menu
        anchorEl={anchor}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        onClose={() => setAnchor(null)}
        open={Boolean(anchor)}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <ListSubheader disableSticky>Appearance</ListSubheader>
        {['light', 'dark'].map((value) => {
          const Icon = value === 'light' ? LightModeOutlined : DarkModeOutlined;
          return (
            <MenuItem
              aria-checked={mode === value}
              key={value}
              onClick={() => {
                if (mode !== value) toggleThemeMode();
                setAnchor(null);
              }}
              role="menuitemradio"
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              {value === 'light' ? 'Light' : 'Dark'}
              {mode === value ? <CheckRounded aria-hidden className="owner-menu-check" fontSize="small" /> : null}
            </MenuItem>
          );
        })}
        <Divider />
        <MenuItem data-mst="owner-sign-out" onClick={leave}>
          <ListItemIcon>
            <LogoutRounded fontSize="small" />
          </ListItemIcon>
          Sign out
        </MenuItem>
      </Menu>
    </>
  );
}
