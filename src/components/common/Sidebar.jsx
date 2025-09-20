// /src/components/common/Sidebar.jsx (FINAL, WITH COPYRIGHT NOTICE)

// --- Core React & Router Imports ---
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

// --- MUI Component Imports ---
import { Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Typography, useTheme, Tooltip, Divider, IconButton } from '@mui/material';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';

// --- Icon & Asset Imports ---
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import GradingOutlined from '@mui/icons-material/GradingOutlined';
import SmartToyOutlined from '@mui/icons-material/SmartToyOutlined';
import lightLogo from '../../assets/mst_logo_no_bg.png';
import darkLogo from '../../assets/mst_logo_dark_no_bg.png';
import { useThemeMode } from '../../hooks/useThemeMode';

const navItems = [
  { text: 'Home', icon: <HomeOutlined />, path: '/' },
  { text: 'Your Classes', icon: <SchoolOutlined />, path: '/classes' },
  { text: 'AI Tools', icon: <AutoAwesomeOutlined />, path: '/tools' },
  { text: 'Assessments', icon: <GradingOutlined />, path: '/assessments' },
  { text: 'Chatbot', icon: <SmartToyOutlined />, path: '/chat' },
];

const copyrightText = "Copyright © 2025 Unique Tech Solution Ltd. All Rights Reserved";

/**
 * The primary navigation component. Supports a collapsible "mini" state on desktop.
 */
const Sidebar = ({ mobileOpen, onDrawerToggle, sidebarWidth, isCollapsed, onToggleCollapse }) => {
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { mode } = useThemeMode();
  
  const collapsedSidebarWidth = theme.spacing(9); // 72px

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', p: 1, height: '64px' }}>
        <img 
          src={mode === 'light' ? lightLogo : darkLogo} 
          alt="ATA Logo" 
          style={{ 
            height: isCollapsed ? '32px' : '50px',
            objectFit: 'contain',
            transition: 'height 0.3s ease-in-out',
          }} 
        />
      </Toolbar>

      <List sx={{ flexGrow: 1 }}>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          
          return (
            <Tooltip title={isCollapsed ? item.text : ''} placement="right" key={item.text}>
              <ListItem disablePadding sx={{ p: theme.spacing(1, 2) }}>
                <ListItemButton
                  onClick={() => {
                    navigate(item.path);
                    if (mobileOpen) { onDrawerToggle(); }
                  }}
                  sx={{
                    borderRadius: 1,
                    backgroundColor: isActive ? theme.palette.secondary.light : 'transparent',
                    justifyContent: isCollapsed ? 'center' : 'initial',
                    '&:hover': {
                      backgroundColor: isActive ? theme.palette.secondary.light : theme.palette.action.hover,
                    },
                  }}
                >
                  <ListItemIcon sx={{ 
                    color: isActive ? 'primary.main' : 'text.secondary',
                    minWidth: 0,
                    mr: isCollapsed ? 'auto' : 3,
                    justifyContent: 'center',
                  }}>
                    {item.icon}
                  </ListItemIcon>
                  {!isCollapsed && (
                    <ListItemText
                      primary={item.text}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 600 : 500,
                        color: isActive ? 'primary.main' : 'text.primary',
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            </Tooltip>
          );
        })}
      </List>
      
      {/* --- [START OF COPYRIGHT AND COLLAPSE SECTION] --- */}
      <Box>
        <Divider />
        
        {/* --- THE NEW COPYRIGHT NOTICE --- */}
        <Box sx={{ p: 2, textAlign: 'center' }}>
          {isCollapsed ? (
            // In collapsed mode, show only the icon with a tooltip.
            <Tooltip title={copyrightText} placement="right">
              <Typography variant="caption" color="text.secondary">
                ©
              </Typography>
            </Tooltip>
          ) : (
            // In expanded mode, show the full text.
            <Typography variant="caption" color="text.secondary">
              {copyrightText}
            </Typography>
          )}
        </Box>
        
        {/* The collapse button is now only visible on desktop. */}
        <Box sx={{ display: { xs: 'none', md: 'block' } }}>
          <Divider />
          <ListItem disablePadding>
            <ListItemButton onClick={onToggleCollapse} sx={{ justifyContent: 'center', py: 2 }}>
              <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', 
                transition: 'transform 0.3s',
                transform: isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)',
              }}>
                <ChevronLeftIcon />
              </ListItemIcon>
            </ListItemButton>
          </ListItem>
        </Box>
      </Box>
      {/* --- [END OF COPYRIGHT AND COLLAPSE SECTION] --- */}
    </Box>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: isCollapsed ? collapsedSidebarWidth : sidebarWidth }, flexShrink: { md: 0 } }}
      aria-label="main navigation"
    >
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onDrawerToggle}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: sidebarWidth },
        }}
      >
        {drawerContent}
      </Drawer>
      
      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: isCollapsed ? collapsedSidebarWidth : sidebarWidth,
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden',
          },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};

export default Sidebar;