// /src/components/common/Layout.jsx

// --- Core React Imports ---
import React, { useState } from 'react';

// --- MUI Component Imports ---
import { Box, Toolbar, useTheme } from '@mui/material';

// --- Custom Component Imports ---
import Header from './Header';
import Sidebar from './Sidebar';

// --- Centralized Layout Constant ---
const SIDEBAR_WIDTH = 240;

/**
 * The main structural component for the entire application.
 * It now manages the state for both the mobile and collapsible sidebars.
 */
const Layout = ({ children }) => {
  // --- Hooks ---
  const theme = useTheme();

  // --- State Management ---
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  
  const collapsedSidebarWidth = theme.spacing(9);

  // --- Event Handlers ---
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  const handleToggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };
  
  const currentDesktopSidebarWidth = isCollapsed ? collapsedSidebarWidth : SIDEBAR_WIDTH;

  return (
    <Box sx={{ display: 'flex' }}>
      
      {/* The application Header */}
      <Header 
        onDrawerToggle={handleDrawerToggle} 
        desktopSidebarWidth={currentDesktopSidebarWidth} 
        isSidebarCollapsed={isCollapsed}
      />

      {/* The application Sidebar */}
      <Sidebar 
        mobileOpen={mobileOpen} 
        onDrawerToggle={handleDrawerToggle} 
        sidebarWidth={SIDEBAR_WIDTH}
        isCollapsed={isCollapsed}
        onToggleCollapse={handleToggleCollapse}
      />

      {/* The Main Content Area wrapper */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          // --- [THE FINAL FIX IS HERE] ---
          // This property now explicitly defines the width for ALL screen sizes.
          // On 'xs', it's 100%. From 'md' and up, it calculates space for the sidebar.
          // This prevents child components from ever forcing the main layout to overflow.
          width: { 
            xs: '100%', 
            md: `calc(100% - ${currentDesktopSidebarWidth}px)` 
          },
          // --- [END OF FIX] ---
          bgcolor: 'background.default',
          minHeight: '100vh',
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {/* CRITICAL SPACER: Pushes content below the fixed Header */}
        <Toolbar />
        
        {/* The actual page content, passed from the Router, is rendered here. */}
        {children}
      </Box>
    </Box>
  );
};

export default Layout;