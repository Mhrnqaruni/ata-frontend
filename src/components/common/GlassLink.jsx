// /src/components/common/GlassLink.jsx
// A clickable glass card (router link): lifts 2px on hover, its shadow fades in on its own layer, and a soft
// light follows the pointer (the card's box is read once on pointerenter; moves only write a transform).

import React, { useRef } from "react";
import { Link as RouterLink } from "react-router-dom";

const canHover = () => typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (prefers-reduced-motion: no-preference)").matches;

export default function GlassLink({ to, className = "", children, onClick, ariaLabel, ...rest }) {
  const light = useRef(null);
  const box = useRef(null);
  const handlers = canHover()
    ? {
        onPointerEnter: (event) => {
          box.current = event.currentTarget.getBoundingClientRect();
        },
        onPointerMove: (event) => {
          const r = box.current;
          if (!r || !light.current) return;
          light.current.style.transform = `translate(${event.clientX - r.left}px, ${event.clientY - r.top}px)`;
        },
      }
    : {};
  return (
    <RouterLink aria-label={ariaLabel} className={`mst-g1 mst-rim mst-lift mst-card-link ${className}`} onClick={onClick} to={to} {...handlers} {...rest}>
      <span aria-hidden="true" className="mst-pointer-light" ref={light} />
      {children}
    </RouterLink>
  );
}
