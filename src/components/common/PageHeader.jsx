// /src/components/common/PageHeader.jsx
// The page's title row: breadcrumbs, the title, an optional line under it and up to two actions.
// It sticks to the top as the page scrolls and condenses into a glass bar once the page has moved
// (a 1px sentinel above it is watched, so nothing is measured while scrolling).

import React, { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Breadcrumbs, IconButton, Link, Tooltip, Typography } from "@mui/material";
import ArrowBackRounded from "@mui/icons-material/ArrowBackRounded";

export default function PageHeader({ title, subtitle, breadcrumbs, actions, backTo, backLabel = "Back", titleAdornment, leading }) {
  const sentinel = useRef(null);
  const [condensed, setCondensed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([entry]) => setCondensed(!entry.isIntersecting), { rootMargin: "-12px 0px 0px 0px" });
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div aria-hidden="true" className="mst-page-sentinel" ref={sentinel} />
      <header className="mst-page-head" data-condensed={condensed ? "true" : "false"} data-enter="">
        {backTo ? (
          <Tooltip title={backLabel}>
            <IconButton aria-label={backLabel} className="mst-page-back" onClick={() => navigate(backTo)}>
              <ArrowBackRounded />
            </IconButton>
          </Tooltip>
        ) : null}
        {leading ? <span className="mst-page-head-leading">{leading}</span> : null}
        <div className="mst-page-head-text">
          {breadcrumbs?.length ? (
            <Breadcrumbs aria-label="Breadcrumb" className="mst-page-head-crumbs">
              {breadcrumbs.map((crumb, i) =>
                crumb.to && i < breadcrumbs.length - 1 ? (
                  <Link color="inherit" component={RouterLink} key={crumb.label} to={crumb.to} underline="hover">
                    {crumb.label}
                  </Link>
                ) : (
                  <Typography aria-current={i === breadcrumbs.length - 1 ? "page" : undefined} color="text.secondary" component="span" fontSize={14} key={crumb.label}>
                    {crumb.label}
                  </Typography>
                ),
              )}
            </Breadcrumbs>
          ) : null}
          <div className="mst-page-head-row">
            <Typography className="mst-page-head-title" component="h1" noWrap={condensed} variant="h1">
              {title}
            </Typography>
            {titleAdornment ? <span className="mst-page-head-adorn">{titleAdornment}</span> : null}
          </div>
          {subtitle ? <p className="mst-page-head-sub">{subtitle}</p> : null}
        </div>
        {actions ? <div className="mst-page-head-actions">{actions}</div> : null}
      </header>
    </>
  );
}
