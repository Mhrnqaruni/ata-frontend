// /src/components/common/ChoiceCards.jsx
// A set of radio cards: real radio inputs (arrow keys move between them), drawn as glass cards with a title,
// a line of help and, optionally, an icon tile and a few facts. Choosing one plays a single soft sheen.

import React, { useState } from "react";
import CheckRounded from "@mui/icons-material/CheckRounded";

export default function ChoiceCards({ name, value, onChange, options, legend, disabled, size = "md", columns }) {
  const [flash, setFlash] = useState(null);
  return (
    <fieldset className="mst-choices" data-size={size} disabled={disabled} style={columns ? { "--cols": columns } : undefined}>
      {legend ? <legend className="mst-choices-legend">{legend}</legend> : null}
      <div className="mst-choices-grid">
        {options.map((opt) => {
          const selected = value === opt.value;
          return (
            <div key={opt.value} style={{minWidth:0}}>
            <label
              className="mst-choice mst-sheen-once"
              data-disabled={opt.disabled ? "true" : undefined}
              data-selected={selected ? "true" : undefined}
              data-sheen={flash === opt.value ? "on" : undefined}
              key={opt.value}
              onAnimationEnd={() => setFlash(null)}
            >
              <input
                checked={selected}
                className="mst-choice-input"
                disabled={disabled || opt.disabled}
                name={name}
                onChange={() => {
                  setFlash(opt.value);
                  onChange(opt.value);
                }}
                type="radio"
                value={opt.value}
              />
              {opt.icon ? <span aria-hidden="true" className="mst-tile" data-ai={opt.ai ? "true" : undefined} data-size={size === "lg" ? "lg" : "sm"}>{opt.icon}</span> : null}
              <span className="mst-choice-text">
                <span className="mst-choice-title">{opt.label}</span>
                {opt.description ? <span className="mst-choice-desc">{opt.description}</span> : null}
                {opt.facts?.length ? (
                  <span className="mst-choice-facts">
                    {opt.facts.map((fact) => (
                      <span key={fact}>{fact}</span>
                    ))}
                  </span>
                ) : null}
              </span>
              <span aria-hidden="true" className="mst-choice-check">
                <CheckRounded />
              </span>
            </label>
            {selected && opt.content}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
