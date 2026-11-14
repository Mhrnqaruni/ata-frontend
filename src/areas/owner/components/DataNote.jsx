// The data note: records are complete from the first live one; earlier numbers are filled in (§3.13, §10 A2).
// It shows only when the page's range starts before that day, with "What's filled in" in a small popover.
// Area: owner

import { useState } from 'react';
import { Button, Popover } from '@mui/material';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { day } from '../format';

export default function DataNote({ completeFrom, start }) {
  const [anchor, setAnchor] = useState(null);
  if (!completeFrom || (start && start >= completeFrom)) return null;
  const date = day(completeFrom);
  return (
    <p className="owner-note" role="note">
      <InfoOutlined aria-hidden="true" />
      <span>
        Records are complete from {date}. Earlier numbers are filled in from older records and may be incomplete.
      </span>
      <Button onClick={(event) => setAnchor(event.currentTarget)} size="small">
        What&apos;s filled in
      </Button>
      <Popover
        anchorEl={anchor}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        onClose={() => setAnchor(null)}
        open={Boolean(anchor)}
      >
        <ul className="owner-note-pop">
          <li>
            AI use before {date} comes from kept marking, Quick and parent records, and the last 30 days of logs (14 on
            dev).
          </li>
          <li>Set-up readings older than the logs aren&apos;t included.</li>
          <li>Active days before {date} are estimated from what people made.</li>
        </ul>
      </Popover>
    </p>
  );
}
