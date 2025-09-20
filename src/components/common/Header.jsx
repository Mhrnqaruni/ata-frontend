// /src/components/common/Header.jsx (FINAL, SECURE, SUPERVISOR-APPROVED VERSION)

// --- Core React Imports ---
import React, { useState } from 'react';
// Import the useNavigate hook to redirect to the login page.
import { useNavigate } from 'react-router-dom'; 

// --- MUI Component Imports ---
import {
  AppBar, Toolbar, IconButton, Typography, Box,
  Menu, MenuItem, Tooltip, ListItemIcon, Button, // Added Button for Login
} from '@mui/material';

// --- [CRITICAL MODIFICATION 1/4: IMPORT HOOKS & ICONS] ---
// Import our custom hooks to consume global state.
import { useAuth } from '../../hooks/useAuth';
import { useThemeMode } from '../../hooks/useThemeMode';

// --- Icon Imports ---
import MenuIcon from '@mui/icons-material/Menu';
import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Logout from '@mui/icons-material/Logout'; // Added Logout icon

/**
 * The application's top-level context bar.
 * This component is now fully dynamic and context-aware. It renders different
 * content based on whether a user is authenticated.
 */
const Header = ({ onDrawerToggle, desktopSidebarWidth }) => {
  // --- Hook Initialization ---
  const [anchorEl, setAnchorEl] = useState(null);
  const isMenuOpen = Boolean(anchorEl);
  const navigate = useNavigate();

  // --- [CRITICAL MODIFICATION 2/4: CONSUME AUTH CONTEXT] ---
  // Consume the global authentication state. This is the key to making the
  // Header dynamic. We get the user object, a flag to know if they're authenticated,
  // and the logout function.
  const { user, isAuthenticated, logout } = useAuth();
  const { mode, toggleThemeMode } = useThemeMode();

  // --- Event Handlers (Unchanged, but `handleLogout` is new) ---
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
  
  // --- [CRITICAL MODIFICATION 3/4: IMPLEMENT LOGOUT HANDLER] ---
  const handleLogout = () => {
    logout();      // Call the function from our useAuth context.
    handleMenuClose(); // Close the menu.
  };

  return (
    <>
      <AppBar
        position="fixed"
        sx={{
          // Styling logic remains the same.
          width: { md: `calc(100% - ${desktopSidebarWidth}px)` },
          ml: { md: `${desktopSidebarWidth}px` },
          boxShadow: 'none',
          backgroundColor: 'background.paper', // Changed to paper for better contrast
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
            color="default" // Changed to inherit to match theme text color
            aria-label="open drawer"
            edge="start"
            onClick={onDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>

          {/* This spacer pushes all content to the right */}
          <Box sx={{ flexGrow: 1 }} />
          
          {/* --- [CRITICAL MODIFICATION 4/4: CONDITIONAL RENDERING] --- */}
          {isAuthenticated ? (
            // --- RENDER THIS IF THE USER IS AUTHENTICATED ---
            <Tooltip title="Account settings">
              <IconButton
                size="large"
                edge="end"
                onClick={handleProfileMenuOpen}
                color="default"
              >
                <Typography variant="button" sx={{ display: { xs: 'none', sm: 'block' }, color: 'text.primary', mr: 1 }}>
                  {/* Display the user's actual email or name */}
                  {user?.fullName || user?.email || 'User'}
                </Typography>
                <AccountCircleOutlined />
              </IconButton>
            </Tooltip>
          ) : (
            // --- RENDER THIS IF THE USER IS NOT AUTHENTICATED ---
            // This is a defensive UI. Users will likely be redirected before they
            // can see this, but it's good practice to have a clear login prompt.
            <Button color="inherit" onClick={() => navigate('/login')}>
              Login
            </Button>
          )}

        </Toolbar>
      </AppBar>

      {/* --- MENU MODIFICATION --- */}
      {/* The Menu is still here, but now its items are more dynamic. */}
      <Menu
        id="primary-account-menu"
        anchorEl={anchorEl}
        open={isMenuOpen}
        onClose={handleMenuClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ elevation: 2, sx: { mt: 1.5, minWidth: 180 } }}
      >
        {/* Profile MenuItem (for future use) */}
        <MenuItem onClick={handleMenuClose} disabled>Profile</MenuItem>
        
        {/* Theme Toggle MenuItem (Unchanged) */}
        <MenuItem onClick={handleThemeToggle}>
          <ListItemIcon>
            {mode === 'dark' ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
          </ListItemIcon>
          {mode === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </MenuItem>
        
        {/* Logout MenuItem (Now functional) */}
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </>
  );
};

export default Header;
