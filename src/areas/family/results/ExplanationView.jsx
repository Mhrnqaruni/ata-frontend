// A saved explanation at its own address (design §3.11; C-14, C-15): its date and text in today's markdown style,
// Advanced at the end (Phase 1.38 design §6.4), then Ask about this. Its list is in the Notebook's materials (S3.5).
// Area: family

import { Button, Typography } from '@mui/material';
import FamilyMarkdown from '../FamilyMarkdown';
import { ukDate } from '../familyWords';

/** `onAsk` is Ask about this; `advanced` is the frame's Advanced disclosure. The frame's Close is the one exit (§6.4). */
export default function ExplanationView({ activity, busy, onAsk, advanced = null }) {
  const text = activity.result?.explanation;
  return (
    <>
      <div className="fam-viewer-scroll">
        <article className="fam-read">
          <Typography className="fam-small">{ukDate(activity.finishedAt || activity.createdAt)}</Typography>
          {text ? (
            <div className="fam-prose">
              <FamilyMarkdown text={text} />
            </div>
          ) : (
            <Typography>This explanation has no text to show.</Typography>
          )}
          {advanced}
        </article>
      </div>
      <footer className="fam-viewer-foot" data-col="680">
        <span className="fam-grow" />
        {text && (
          <Button variant="contained" disabled={busy} onClick={onAsk} data-mst="family-explanation-ask">
            Ask about this
          </Button>
        )}
      </footer>
    </>
  );
}
