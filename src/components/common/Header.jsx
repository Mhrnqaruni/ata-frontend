// /src/components/common/Header.jsx

// --- Core React Imports ---
import React, { useState } from 'react';

// --- MUI Component Imports ---
import { AppBar, Toolbar, IconButton, Typography, Box, Menu, MenuItem, Tooltip, ListItemIcon } from '@mui/material';

// --- Custom Hook Imports ---
import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../hooks/useThemeMode';

// --- Icon Imports ---
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';

/**
 * The application's top-level context bar.
 * It is now aware of the desktop sidebar's collapsed state to adjust its own size.
 */
const Header = ({ onDrawerToggle, desktopSidebarWidth }) => {
  // --- State Management for User Menu Dropdown ---
  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);

  // --- Consume Global State ---
  const { user } = useAuth();
  const { mode, toggleThemeMode } = useThemeMode();

  // --- Event Handlers for User Menu ---
  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleThemeToggle = () => {
    toggleThemeMode();
    handleMenuClose();
  };

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          width: { md: `calc(100% - ${desktopSidebarWidth}px)` },
          ml: { md: `${desktopSidebarWidth}px` },
          boxShadow: 'none',
          backgroundColor: 'background.default',
          borderBottom: '1px solid',
          borderColor: 'divider',
          transition: (theme) => theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="default"
            aria-label="open drawer"
            edge="start"
            onClick={onDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ flexGrow: 1 }} />

          <Tooltip title="Account settings">
            <IconButton
              size="large"
              edge="end"
              aria-label="account of current user"
              aria-controls="primary-account-menu"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
              color="default"
            >
              <Typography variant="button" sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.primary', mr: 1 }}>
                {/* --- [THE FIX IS HERE] --- */}
                {/* V2 TODO: Uncomment the line below to display the dynamic user name after real authentication is implemented. */}
                {/* {user ? user.name : 'User'} */}

                {/* V1 Placeholder: Display a generic, professional title. */}
                Dear Teacher
                {/* --- [END OF FIX] --- */}
              </Typography>
              <AccountCircleOutlined />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Menu
        id="primary-account-menu"
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ elevation: 2, sx: { mt: 1.5 } }}
      >
        <MenuItem onClick={handleMenuClose}>Profile</MenuItem>
        <MenuItem onClick={handleThemeToggle}>
          <ListItemIcon>
            {mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
          </ListItemIcon>
          {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>Logout</MenuItem>
      </Menu>
    </>
  );
};

export default Header;