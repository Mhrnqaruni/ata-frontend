// A closed disclosure holding stored text exactly as kept: prose as plain text, JSON pretty-printed (§3.13).
// Never HTML or Markdown: React prints it as text, so nothing in an answer or a reply can run (SOT-10).
// Area: owner

import { useEffect, useState } from 'react';
import { Button } from '@mui/material';
import ExpandMoreRounded from '@mui/icons-material/ExpandMoreRounded';
import { size } from '../format';

// A JSON object or list kept as a string (such as the AI's readings) is read back, so it's pretty-printed too.
function parsed(value) {
  if (typeof value !== 'string' || !/^\s*[[{]/.test(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// The value as text: itself when it's text, otherwise its JSON, indented.
export function asText(value) {
  const data = parsed(value);
  return typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

export default function TextViewer({ title, value, expanded, empty = 'Nothing kept.' }) {
  const [open, setOpen] = useState(Boolean(expanded));
  const [whole, setWhole] = useState(false);
  // "Expand all" and "Collapse all" on the page set every viewer at once.
  useEffect(() => {
    if (expanded !== undefined) setOpen(expanded);
  }, [expanded]);
  const missing = value === null || value === undefined || value === '';
  const text = missing ? '' : asText(value);
  const json = !missing && typeof parsed(value) !== 'string';
  return (
    <div className="owner-viewer" data-open={open ? 'true' : 'false'}>
      <button aria-expanded={open} className="owner-viewer-head" onClick={() => setOpen(!open)} type="button">
        <ExpandMoreRounded aria-hidden="true" className="owner-viewer-arrow" />
        <span>{title}</span>
        <span className="owner-viewer-size">{missing ? empty : size(text)}</span>
      </button>
      {open && !missing ? (
        <>
          <pre
            className="owner-viewer-text"
            data-json={json ? 'true' : undefined}
            data-whole={whole ? 'true' : 'false'}
          >
            {text}
          </pre>
          {text.length > 1500 && !whole ? (
            <Button className="owner-viewer-all" onClick={() => setWhole(true)} size="small">
              Show all
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
