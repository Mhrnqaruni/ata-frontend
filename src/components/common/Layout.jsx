// /src/components/common/Layout.jsx
// The signed-in shell: the still brand ground, the floating glass sidebar, a slim glass bar on phones,
// and the page column (max 1320). On a route change the page's first blocks rise into place
// (Web Animations API on the existing nodes; nothing remounts).

import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AppBar, Box, IconButton, Toolbar } from "@mui/material";
import MenuRounded from "@mui/icons-material/MenuRounded";
import Sidebar from "./Sidebar";
import "../home/home.css";
import logo from "../../assets/mst_logo_no_bg.png";

const SIDEBAR_WIDTH = 212;
const COLLAPSED_WIDTH = 76;
const COLLAPSE_KEY = "mst.nav.collapsed";
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const Layout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === "1";
    } catch {
      return false;
    }
  });
  const pageRef = useRef(null);
  const mainRef = useRef(null);
  const collapseFrom = useRef(null);
  const location = useLocation();

  const handleToggleCollapse = () => {
    collapseFrom.current = mainRef.current?.getBoundingClientRect().left ?? null;
    setIsCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, value ? "0" : "1");
      } catch {
        /* the choice just isn't remembered */
      }
      return !value;
    });
  };

  // FLIP: the page column moves to its new place by transform, never by animating width
  useLayoutEffect(() => {
    const from = collapseFrom.current;
    collapseFrom.current = null;
    if (from === null || !mainRef.current || reducedMotion()) return;
    const delta = from - mainRef.current.getBoundingClientRect().left;
    if (delta) mainRef.current.animate([{ transform: `translateX(${delta}px)` }, { transform: "none" }], { duration: 280, easing: "cubic-bezier(.32,.72,0,1)" });
  }, [isCollapsed]);

  // page enter: up to six top-level blocks rise 8px and fade in, 40ms apart (route changes only)
  useEffect(() => {
    window.scrollTo(0, 0);
    const page = pageRef.current;
    if (!page || reducedMotion() || typeof page.animate !== "function") return;
    const raf = requestAnimationFrame(() => {
      const root = page.firstElementChild;
      const blocks = Array.from((root && root.children.length ? root : page).children).filter((el) => el.offsetParent !== null || el.getClientRects().length).slice(0, 6);
      blocks.forEach((el, i) => {
        if (el.classList.contains("mst-page-sentinel")) return;
        el.animate([{ opacity: 0, transform: "translateY(8px)" }, { opacity: 1, transform: "none" }], { duration: 260, delay: i * 40, easing: "cubic-bezier(.32,.72,0,1)", fill: "backwards" });
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [location.pathname]);

  const width = isCollapsed ? COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      {/* one shared gradient for icons that wear the brand's AI colours */}
      <svg aria-hidden="true" focusable="false" height="0" style={{ position: "absolute" }} width="0">
        <defs>
          <linearGradient id="mst-ai-grad" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stopColor="var(--mst-ai-a)" />
            <stop offset="1" stopColor="var(--mst-ai-b)" />
          </linearGradient>
        </defs>
      </svg>

      <AppBar className="mst-mobilebar" elevation={0} position="fixed" sx={{ display: { md: "none" } }}>
        <Toolbar sx={{ minHeight: 60, gap: 1 }}>
          <IconButton aria-label="Open navigation" edge="start" onClick={() => setMobileOpen(true)}>
            <MenuRounded />
          </IconButton>
          <img alt="MySmartTeach" className="mst-mobilebar-logo" src={logo} />
        </Toolbar>
      </AppBar>

      <Sidebar
        collapsedWidth={COLLAPSED_WIDTH}
        isCollapsed={isCollapsed}
        mobileOpen={mobileOpen}
        onDrawerToggle={() => setMobileOpen((open) => !open)}
        onToggleCollapse={handleToggleCollapse}
        sidebarWidth={SIDEBAR_WIDTH}
      />

      <Box
        component="main"
        ref={mainRef}
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { xs: "100%", md: `calc(100% - ${width}px)` },
          px: { xs: 2, sm: 3, lg: 4 },
          pt: { xs: "76px", md: 3 },
          pb: 2,
        }}
      >
        <Box ref={pageRef} sx={{ width: "100%", maxWidth: 1320, mx: "auto", minWidth: 0 }}>
          {children}
        </Box>
        {location.pathname.startsWith("/chat") ? null : <footer className="mst-footer">© 2026 Unique Tech Solution Ltd. All rights reserved.</footer>}
      </Box>
    </Box>
  );
};

export default Layout;
