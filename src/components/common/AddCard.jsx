// /src/components/common/AddCard.jsx
// The last tile in a card grid: a dashed glass card that starts the next thing ("Add a class", "Create a quiz").
import React from "react";
import AddRounded from "@mui/icons-material/AddRounded";

export default function AddCard({ label, hint, onClick, minHeight }) {
  return (
    <button className="mst-add-card" onClick={onClick} style={minHeight ? { minHeight } : undefined} type="button">
      <span aria-hidden="true" className="mst-add-card-icon"><AddRounded /></span>
      <span className="mst-add-card-label">{label}</span>
      {hint ? <span className="mst-add-card-hint">{hint}</span> : null}
    </button>
  );
}
