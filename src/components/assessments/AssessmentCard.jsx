import DeleteOutline from '@mui/icons-material/DeleteOutline';
// /src/components/assessments/AssessmentCard.jsx
// One assessment as a glass card: title + status, "class · date", the AI bar while it's being graded, two
// figures when it's done, and a footer with results or same-assessment retry.
import React from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, IconButton, Tooltip } from "@mui/material";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import StatusChip from "./StatusChip";
import CompletedStats from "./CompletedStats";

export default function AssessmentCard({ job, onDelete }) {
  const navigate = useNavigate();
  const clickable = ["Pending Review", "Completed"].includes(job.status);
  const working = ["Processing", "Summarizing", "Queued"].includes(job.status);
  const open = () => navigate(`/assessments/${job.id}/results`);
  const date = job.createdAt ? new Date(job.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : null;

  return (
    <Card className={`mst-rim mst-asm-card${clickable ? " mst-lift" : ""}`} data-enter="">
      {working ? <div aria-hidden="true" className="mst-ai-bar mst-asm-bar" /> : null}
      <div className="mst-asm-body" onClick={clickable ? open : undefined} role="presentation">
        <div className="mst-asm-top">
          <h2 className="mst-asm-title">{job.assessmentName}</h2>
          <StatusChip progress={job.progress} status={job.status} />
        </div>
        <div className="mst-asm-meta">{[job.className, date].filter(Boolean).join(" · ") || "Date unavailable"}</div>
        {job.status === "Completed" ? <CompletedStats results={job.results} /> : null}
      </div>
      <div className="mst-asm-foot">
        <Tooltip title={working ? "Wait for this assessment to finish" : "Delete assessment"}>
          <span><IconButton aria-label={`Delete ${job.assessmentName}`} onClick={onDelete} disabled={working} color="error"><DeleteOutline fontSize="small"/></IconButton></span>
        </Tooltip>
        {job.status === 'Failed' && <Button size="small" variant="outlined"
          onClick={() => navigate(`/assessments/new?retryJobId=${encodeURIComponent(job.id)}`)}>Retry</Button>}
        <Button disabled={!clickable} endIcon={<ArrowForwardRounded />} onClick={open} size="small" variant="text">
          View results
        </Button>

      </div>
    </Card>
  );
}
