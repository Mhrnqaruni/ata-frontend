import AccountSettings from './AccountSettings';
import React, { useState } from 'react';
import { Avatar, Button, Divider, IconButton, ListItemIcon, ListSubheader, Menu, MenuItem, Typography } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import CheckRounded from '@mui/icons-material/CheckRounded';
import LightModeOutlined from '@mui/icons-material/LightModeOutlined';
import DarkModeOutlined from '@mui/icons-material/DarkModeOutlined';
import LogoutRounded from '@mui/icons-material/LogoutRounded';
import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../hooks/useThemeMode';
import ModeSwitch from './ModeSwitch';
import './AccountMenu.css';

/** The same adult menu is used by both workspaces; modes never change identity. */
export default function AccountMenu({ compact = false }) {
  const { user, logout } = useAuth();
  const { mode, toggleThemeMode } = useThemeMode();
  const [settings,setSettings]=useState(false);
  const [anchor, setAnchor] = useState(null);
  const name = user?.fullName || user?.full_name || user?.email || 'Your account';
  const initial = name.trim().charAt(0).toUpperCase() || '?';
  const open = e => setAnchor(e.currentTarget);
  return <>
    {compact ? <IconButton aria-label={`Account: ${name}`} aria-haspopup="menu" aria-expanded={!!anchor} onClick={open} className="mst-account-btn">
        <Avatar sx={{ width: 32, height: 32, bgcolor: 'var(--f-accent, var(--mst-accent-solid))', color: '#fff', fontSize: 15, fontWeight: 600 }}>{initial}</Avatar></IconButton>
      : <Button aria-label={`Account: ${name}`} aria-haspopup="menu" aria-expanded={!!anchor} onClick={open} endIcon={<ExpandMoreRounded />}
        sx={{ minHeight: 44, gap: 1, maxWidth: 220, color: 'text.primary' }} className="mst-account-btn">
        <Avatar sx={{ width: 30, height: 30, bgcolor: 'var(--f-accent, var(--mst-accent-solid))', color: '#fff', fontSize: 14, fontWeight: 600 }}>{initial}</Avatar>
        <Typography noWrap sx={{ fontSize: 14, fontWeight: 500 }}>{name.split(' ')[0]}</Typography>
      </Button>}
    <Menu open={!!anchor} anchorEl={anchor} onClose={() => setAnchor(null)} className="mst-account-menu"
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
      <div className="mst-account-who" aria-hidden><Avatar sx={{ width: 36, height: 36, bgcolor: 'var(--f-accent, var(--mst-accent-solid))', color: '#fff', fontSize: 15, fontWeight: 600 }}>{initial}</Avatar>
        <span><span className="mst-account-name">{name}</span>{user?.email && user.email !== name && <span className="mst-account-mail">{user.email}</span>}</span></div>
      <Divider />
      <ModeSwitch onSelected={() => setAnchor(null)} />
      <Divider />
      <ListSubheader disableSticky className="mst-account-sub">Appearance</ListSubheader>
      {['light', 'dark'].map(value => { const Icon = value === 'light' ? LightModeOutlined : DarkModeOutlined; return <MenuItem key={value} role="menuitemradio" aria-checked={mode === value}
        onClick={() => { if (mode !== value) toggleThemeMode(); setAnchor(null); }}>
        <ListItemIcon><Icon fontSize="small" /></ListItemIcon>{value === 'light' ? 'Light' : 'Dark'}
        {mode === value && <CheckRounded fontSize="small" className="mst-account-check" aria-hidden />}</MenuItem>; })}
      <Divider />
      {user?.role!=="admin" && <MenuItem onClick={()=>{setAnchor(null);setSettings(true);}}>Account settings</MenuItem>}
      <MenuItem onClick={() => { setAnchor(null); logout(); }}><ListItemIcon><LogoutRounded fontSize="small" /></ListItemIcon>Sign out</MenuItem>
    </Menu>
    {settings && <AccountSettings open onClose={()=>setSettings(false)}/>}
  </>;
}
