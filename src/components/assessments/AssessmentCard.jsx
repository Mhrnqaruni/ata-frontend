import ElapsedTime from '../common/ElapsedTime';
import DeleteOutline from '@mui/icons-material/DeleteOutline';
import MoreVert from '@mui/icons-material/MoreVert';
import EditOutlined from '@mui/icons-material/EditOutlined';
// /src/components/assessments/AssessmentCard.jsx
// One assessment as a glass card: title + status, "class · date", the AI bar while it's being graded, two
// figures when it's done, and a footer with results or same-assessment retry.
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, Button, IconButton, Menu, MenuItem } from "@mui/material";
import ArrowForwardRounded from "@mui/icons-material/ArrowForwardRounded";
import StatusChip from "./StatusChip";
import CompletedStats from "./CompletedStats";

export default function AssessmentCard({ job, onDelete, onRename }) {
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
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
        <div style={{display:'grid',gap:4,marginTop:8}}>
          <ElapsedTime clock={job.clock}/>
          {working && job.update && <span className="mst-hint" role="status">{job.update}{job.ai_completed ? ` ${job.ai_completed} AI responses received.` : ''}</span>}
        </div>
      </div>
      <div className="mst-asm-foot">
        <IconButton aria-label={`Options for ${job.assessmentName}`} aria-haspopup="menu"
          aria-expanded={Boolean(anchor)} onClick={event=>setAnchor(event.currentTarget)} sx={{width:44,height:44}}><MoreVert/></IconButton>
        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={()=>setAnchor(null)}>
          <MenuItem disabled={working} onClick={()=>{setAnchor(null);onRename();}}><EditOutlined fontSize="small" sx={{mr:1}}/>Rename</MenuItem>
          <MenuItem disabled={working} onClick={()=>{setAnchor(null);onDelete();}} sx={{color:'error.main'}}><DeleteOutline fontSize="small" sx={{mr:1}}/>Delete</MenuItem>
          {working && <MenuItem disabled>Available after processing finishes</MenuItem>}
        </Menu>
        {job.status === 'Failed' && <Button size="small" variant="outlined"
          onClick={() => navigate(`/assessments/new?retryJobId=${encodeURIComponent(job.id)}`)}>Review retry</Button>}
        <Button disabled={!clickable} endIcon={<ArrowForwardRounded />} onClick={open} size="small" variant="text">
          View results
        </Button>

      </div>
    </Card>
  );
}
