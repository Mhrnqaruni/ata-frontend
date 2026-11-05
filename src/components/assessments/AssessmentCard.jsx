// One assessment as a card on the Assessments list: status, class and date, with rename, delete and retry.
// Area: assessments

import ElapsedTime from '../common/ElapsedTime';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import MoreVert from '@mui/icons-material/MoreVert';
import EditOutlined from '@mui/icons-material/EditOutlined';
// One assessment as a glass card: title + status, "class · date", the AI bar while it's being graded, two
// figures when it's done, and a footer with results or same-assessment retry.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Button, IconButton, Menu, MenuItem } from '@mui/material';
import ArrowForwardRounded from '@mui/icons-material/ArrowForwardRounded';
import WarningAmberRounded from '@mui/icons-material/WarningAmberRounded';
import StatusChip from './StatusChip';
import CompletedStats from './CompletedStats';

// A Failed card's reason, in the meta size but full ink, cut to two lines (design R1c).
const TWO_LINES = { display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' };

export default function AssessmentCard({ job, onDelete, onRename }) {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const clickable = ['Pending Review', 'Completed'].includes(job.status);
  const working = ['Processing', 'Summarizing', 'Queued'].includes(job.status);
  const failed = job.status === 'Failed';
  const reason = job.failureReason || 'No reason was recorded. You can try again.';
  const held = job.heldFiles || 0;
  const open = () => navigate(`/assessments/${job.id}/results`);
  const date = job.createdAt
    ? new Date(job.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <Card
      id={`assessment-${job.id}`}
      tabIndex={-1}
      className={`mst-rim mst-asm-card${clickable ? ' mst-lift' : ''}`}
      data-enter=""
    >
      {working ? <div aria-hidden="true" className="mst-ai-bar mst-asm-bar" /> : null}
      <div className="mst-asm-body" onClick={clickable ? open : undefined} role="presentation">
        <div className="mst-asm-top">
          <h2 className="mst-asm-title">{job.assessmentName}</h2>
          <StatusChip progress={job.progress} status={job.status} />
        </div>
        <div className="mst-asm-meta">{[job.className, date].filter(Boolean).join(' · ') || 'Date unavailable'}</div>
        {failed && (
          <div className="mst-asm-meta" style={{ ...TWO_LINES, color: 'var(--mst-ink)' }} title={reason}>
            {reason}
          </div>
        )}
        {held > 0 && !failed && (
          <div className="mst-asm-meta" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <WarningAmberRounded aria-hidden="true" color="warning" sx={{ fontSize: 16 }} />
            {held === 1 ? '1 file not graded' : `${held} files not graded`}
          </div>
        )}
        {job.status === 'Completed' ? <CompletedStats results={job.results} /> : null}
        <div style={{ display: 'grid', gap: 4, marginTop: 8 }}>
          <ElapsedTime clock={job.clock} />
          {working && job.update && (
            <span className="mst-hint" role="status">
              {job.update}
              {job.ai_completed ? ` ${job.ai_completed} AI responses received.` : ''}
            </span>
          )}
        </div>
      </div>
      <div className="mst-asm-foot">
        <IconButton
          aria-label={`Options for ${job.assessmentName}`}
          aria-haspopup="menu"
          aria-expanded={Boolean(anchor)}
          onClick={(event) => setAnchor(event.currentTarget)}
          sx={{ width: 44, height: 44 }}
        >
          <MoreVert />
        </IconButton>
        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
          <MenuItem
            disabled={working}
            onClick={() => {
              setAnchor(null);
              onRename();
            }}
          >
            <EditOutlined fontSize="small" sx={{ mr: 1 }} />
            Rename
          </MenuItem>
          <MenuItem
            disabled={working}
            onClick={() => {
              setAnchor(null);
              onDelete();
            }}
            sx={{ color: 'error.main' }}
          >
            <DeleteOutline fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
          {working && <MenuItem disabled>Available after processing finishes</MenuItem>}
        </Menu>
        {/* After the class or list changed, only a new assessment helps (design §5). */}
        {failed && job.failureCode !== 'IDENTITY_UNRESOLVED' && (
          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate(`/assessments/new?retryJobId=${encodeURIComponent(job.id)}`)}
          >
            Review and retry
          </Button>
        )}
        {!failed && (
          <Button disabled={!clickable} endIcon={<ArrowForwardRounded />} onClick={open} size="small" variant="text">
            View results
          </Button>
        )}
      </div>
    </Card>
  );
}
