// /src/components/common/Sidebar.jsx
// The primary navigation: a floating glass panel over the page's colour. Groups: Home · Teaching · AI.
// The active item carries a small gradient pill at the panel's edge that slides between items.
// Collapsible to icons on desktop; a temporary drawer below 900px.

import React, { useLayoutEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Box, Drawer, Divider, IconButton, ListItemIcon, Menu, MenuItem, Tooltip } from "@mui/material";
import ChevronLeftRounded from "@mui/icons-material/ChevronLeftRounded";
import HomeOutlined from "@mui/icons-material/HomeOutlined";
import SchoolOutlined from "@mui/icons-material/SchoolOutlined";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import GradingOutlined from "@mui/icons-material/GradingOutlined";
import ForumOutlined from "@mui/icons-material/ForumOutlined";
import QuizOutlined from "@mui/icons-material/QuizOutlined";
import LightModeOutlined from "@mui/icons-material/LightModeOutlined";
import DarkModeOutlined from "@mui/icons-material/DarkModeOutlined";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import PersonOutlineRounded from "@mui/icons-material/PersonOutlineRounded";
import logo from "../../assets/mst_logo_no_bg.png";
import { useThemeMode } from "../../hooks/useThemeMode";
import { useAuth } from "../../hooks/useAuth";

export const NAV_GROUPS = [
  { label: null, items: [{ text: "Home", icon: HomeOutlined, path: "/" }] },
  {
    label: "Teaching",
    items: [
      { text: "Classes", icon: SchoolOutlined, path: "/classes", also: ["/students"] },
      { text: "Assessments", icon: GradingOutlined, path: "/assessments" },
      { text: "Quizzes", icon: QuizOutlined, path: "/quizzes" },
    ],
  },
  {
    label: "AI",
    items: [
      { text: "AI tools", icon: AutoAwesomeOutlined, path: "/tools" },
      { text: "Assistant", icon: ForumOutlined, path: "/chat" },
    ],
  },
];

const isActivePath = (pathname, item) =>
  item.path === "/" ? pathname === "/" : [item.path, ...(item.also || [])].some((p) => pathname === p || pathname.startsWith(`${p}/`));

const initialsOf = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "?";

function SidebarPanel({ collapsed, onToggleCollapse, onNavigate, showCollapse }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { mode, toggleThemeMode } = useThemeMode();
  const { user, logout } = useAuth();
  const [menuAnchor, setMenuAnchor] = useState(null);
  const listRef = useRef(null);
  const [indicator, setIndicator] = useState(null);

  // the gradient pill follows the active item: one read per route change (or collapse), never per frame
  useLayoutEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector('[aria-current="page"]');
    setIndicator(active ? active.offsetTop + active.offsetHeight / 2 - 10 : null);
  }, [location.pathname, collapsed]);

  const name = user?.fullName || user?.full_name || user?.email || "Your account";
  const role = user?.role ? user.role[0].toUpperCase() + user.role.slice(1) : "Teacher";

  return (
    <div className="mst-side" data-collapsed={collapsed ? "true" : "false"}>
      <div className="mst-side-top">
        {collapsed ? (
          <span aria-hidden="true" className="mst-side-star">
            <svg viewBox="0 0 24 24"><path d="M12 1.8c.6 4.9 2.6 7.6 9.4 10.2-6.8 2.6-8.8 5.3-9.4 10.2-.6-4.9-2.6-7.6-9.4-10.2C9.4 9.4 11.4 6.7 12 1.8Z" fill="url(#mst-ai-grad)" /></svg>
          </span>
        ) : (
          <img alt="MySmartTeach" className="mst-side-logo" src={logo} />
        )}
        {showCollapse ? (
          <Tooltip placement="right" title={collapsed ? "Expand navigation" : "Collapse navigation"}>
            <IconButton aria-label={collapsed ? "Expand navigation" : "Collapse navigation"} className="mst-side-collapse" onClick={onToggleCollapse}>
              <ChevronLeftRounded />
            </IconButton>
          </Tooltip>
        ) : null}
      </div>

      <nav aria-label="Main" className="mst-side-nav" ref={listRef}>
        {indicator !== null ? <span aria-hidden="true" className="mst-side-indicator" style={{ transform: `translateY(${indicator}px)` }} /> : null}
        {NAV_GROUPS.map((group) => (
          <div className="mst-side-group" key={group.label || "home"}>
            {group.label ? (collapsed ? <span aria-hidden="true" className="mst-side-rule" /> : <div className="mst-side-label">{group.label}</div>) : null}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(location.pathname, item);
              const button = (
                <a
                  aria-current={active ? "page" : undefined}
                  aria-label={collapsed ? item.text : undefined}
                  className="mst-side-item"
                  href={item.path}
                  key={item.path}
                  onClick={(event) => {
                    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button === 1) return;
                    event.preventDefault();
                    navigate(item.path);
                    onNavigate?.();
                  }}
                >
                  <Icon aria-hidden="true" className="mst-side-icon" />
                  <span className="mst-side-text">{item.text}</span>
                </a>
              );
              return collapsed ? (
                <Tooltip key={item.path} placement="right" title={item.text}>
                  {button}
                </Tooltip>
              ) : (
                button
              );
            })}
          </div>
        ))}
      </nav>

      <div className="mst-side-bottom">
        <button aria-controls={menuAnchor ? "mst-account-menu" : undefined} aria-expanded={Boolean(menuAnchor)} aria-haspopup="menu" aria-label={`Account: ${name}`} className="mst-side-user" onClick={(event) => setMenuAnchor(event.currentTarget)} type="button">
          <span aria-hidden="true" className="mst-avatar">{initialsOf(user?.fullName || user?.email)}</span>
          <span className="mst-side-user-text">
            <span className="mst-side-user-name">{name}</span>
            <span className="mst-side-user-role">{role}</span>
          </span>
          <ChevronLeftRounded className="home-account-chevron" aria-hidden="true"/>
        </button>
        <Menu anchorEl={menuAnchor} anchorOrigin={{ vertical: "top", horizontal: "right" }} id="mst-account-menu" onClose={() => setMenuAnchor(null)} open={Boolean(menuAnchor)} transformOrigin={{ vertical: "bottom", horizontal: "left" }}>
          <MenuItem disabled className="home-menu-heading">Appearance</MenuItem>
          <MenuItem role="menuitemradio" aria-checked={mode==='light'} selected={mode==='light'} onClick={()=>{if(mode!=='light')toggleThemeMode();setMenuAnchor(null);}}>
            <ListItemIcon><LightModeOutlined fontSize="small"/></ListItemIcon>Light appearance
          </MenuItem>
          <MenuItem role="menuitemradio" aria-checked={mode==='dark'} selected={mode==='dark'} onClick={()=>{if(mode!=='dark')toggleThemeMode();setMenuAnchor(null);}}>
            <ListItemIcon><DarkModeOutlined fontSize="small"/></ListItemIcon>Dark appearance
          </MenuItem>
          <Divider/>
          <MenuItem disabled>
            <ListItemIcon>
              <PersonOutlineRounded fontSize="small" />
            </ListItemIcon>
            Profile
          </MenuItem>
          <MenuItem
            onClick={() => {
              setMenuAnchor(null);
              logout();
            }}
          >
            <ListItemIcon>
              <LogoutRounded fontSize="small" />
            </ListItemIcon>
            Sign out
          </MenuItem>
        </Menu>
      </div>
    </div>
  );
}

const Sidebar = ({ mobileOpen, onDrawerToggle, sidebarWidth, collapsedWidth, isCollapsed, onToggleCollapse }) => (
  <Box aria-label="Main navigation" component="aside" sx={{ width: { md: isCollapsed ? collapsedWidth : sidebarWidth }, flexShrink: { md: 0 } }}>
    <Drawer
      ModalProps={{ keepMounted: true }}
      onClose={onDrawerToggle}
      open={mobileOpen}
      sx={{ display: { xs: "block", md: "none" }, "& .MuiDrawer-paper": { width: sidebarWidth + 12, boxSizing: "border-box" } }}
      variant="temporary"
    >
      <SidebarPanel collapsed={false} onNavigate={onDrawerToggle} showCollapse={false} />
    </Drawer>
    <Drawer
      open
      sx={{ display: { xs: "none", md: "block" }, "& .MuiDrawer-paper": { width: isCollapsed ? collapsedWidth : sidebarWidth, boxSizing: "border-box", overflow: "visible" } }}
      variant="permanent"
    >
      <SidebarPanel collapsed={isCollapsed} onToggleCollapse={onToggleCollapse} showCollapse />
    </Drawer>
  </Box>
);

export default Sidebar;
