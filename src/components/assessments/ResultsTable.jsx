import useTableSort from '../../hooks/useTableSort';
import { Link } from 'react-router-dom';
import React, { useState } from 'react';
import { useSnackbar } from '../../hooks/useSnackbar';
import { Button, Card, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tooltip, Typography, useTheme, Menu, MenuItem, TableSortLabel } from '@mui/material';
import DownloadRounded from '@mui/icons-material/DownloadRounded';
import EmptyState from '../common/EmptyState';
import { initialsOf } from '../classes/StudentTable';
import AssignmentOutlined from '@mui/icons-material/AssignmentOutlined';
import { useNavigate, useParams } from 'react-router-dom';
import StatusChip from './StatusChip';
import '../common/responsive-table.css';
import reviewService from '../../services/reviewService';

const ResultsTable = ({ rows, assessmentOnly = false }) => {
  const navigate = useNavigate();
  const { job_id } = useParams();
  const theme = useTheme();
  const [showIds,setShowIds]=useState(false);
  const prepared=(rows||[]).map(row=>({...row,
    gradeSort:['AI_GRADED','TEACHER_GRADED'].includes(row.status) && row.totalScore != null && row.maxTotalScore > 0 ? row.totalScore / row.maxTotalScore * 100 : null,
    statusSort: ({PENDING_REVIEW:0,TEACHER_GRADED:1,AI_GRADED:2,ABSENT:3})[row.status] ?? null}));
  const {sortedData,requestSort,sortColumn,sortDirection}=useTableSort(prepared,{studentName:{type:'string'},statusSort:{type:'number'},gradeSort:{type:'number'}},'studentName');
  const heading=(key,label)=><TableCell sortDirection={sortColumn===key?sortDirection:false}><TableSortLabel active={sortColumn===key} direction={sortColumn===key?sortDirection:'asc'} onClick={()=>requestSort(key)}>{label}</TableSortLabel></TableCell>;


  const { showSnackbar } = useSnackbar();
  const [downloadMenu, setDownloadMenu] = useState(null);
  const [downloading, setDownloading] = useState(null);
  const handleDownload = async (format) => {
    const entityId = downloadMenu.entityId;
    setDownloadMenu(null); setDownloading(entityId);
    try { await reviewService.downloadReport(job_id, entityId, format); }
    catch (error) { showSnackbar(error.message || 'Report download failed.', 'error'); }
    finally { setDownloading(null); }
  };

  const handleReview = (entityId) => {
    navigate(`/assessments/${job_id}/review/${entityId}`);
  };

  if (!rows || rows.length === 0) {
    return (
      <EmptyState icon={<AssignmentOutlined />} title="No results yet">
        Student results appear here as soon as grading finishes.
      </EmptyState>
    );
  }

  const rosteredStudents = sortedData.filter(s => !s.isOutsider);
  const outsiderStudents = sortedData.filter(s => s.isOutsider);

  const renderStudentRow = (s) => {
    let grade;
    if (s.status === 'PENDING_REVIEW') {
      grade = <span className="mst-cell-muted">Pending</span>;
    } else if (s.status === 'ABSENT') {
      grade = <span className="mst-cell-muted">—</span>;
    } else if (s.totalScore != null && s.maxTotalScore != null && s.maxTotalScore > 0) {
      const pct = (s.totalScore / s.maxTotalScore) * 100;
      grade = (
        <span className="mst-grade mst-grade-fraction" data-band={pct >= 85 ? 'high' : pct < 70 ? 'low' : 'mid'}>
          <span className="mst-grade-value">{s.totalScore.toFixed(1)} / {s.maxTotalScore.toFixed(1)}</span>
          <span aria-hidden="true" className="mst-grade-bar"><span style={{ transform: `scaleX(${Math.max(0, Math.min(100, pct)) / 100})` }} /></span>
        </span>
      );
    } else if (s.totalScore != null) {
      grade = s.totalScore.toFixed(1);
    } else {
      grade = <span className="mst-cell-muted">—</span>;
    }
    const canReview = s.status !== 'ABSENT';
    const canDownload = s.totalScore != null && ['AI_GRADED','TEACHER_GRADED'].includes(s.status);
    return (
      <TableRow key={s.entityId} className="mst-result-record">
        <TableCell component="th" scope="row" data-label="Student">
          <span className="mst-person">
            <span aria-hidden="true" className="mst-avatar">{initialsOf(s.studentName)}</span>
            {s.isOutsider ? <span className="mst-person-name" style={{cursor:"default",textDecoration:"none"}}>{s.studentName}</span> : <Link className="mst-person-name" to={`/students/${encodeURIComponent(s.entityId)}`}>{s.studentName}</Link>}
          </span>
        </TableCell>
        {showIds && <TableCell className="mst-cell-muted" data-label="Student ID">{s.isOutsider ? "—" : s.studentId}</TableCell>}
        <TableCell data-label="Status"><StatusChip status={s.status} /></TableCell>
        <TableCell data-label="Grade">{grade}</TableCell>
        <TableCell align="right" className="mst-row-actions mst-row-actions-on" data-label="Actions">
          {s.status==='ABSENT'?<span className="mst-cell-muted">No submission</span>:<>
          <Button size="small" variant="outlined" onClick={() => handleReview(s.entityId)} disabled={!canReview} sx={{ mr: 0.5 }}>
            Review
          </Button>
          <Tooltip title={canDownload ? 'Download report' : 'No report yet'}>
            <span>
              <IconButton aria-label={`Download ${s.studentName}'s report`} onClick={event => setDownloadMenu({ anchor: event.currentTarget, entityId: s.entityId })} disabled={!canDownload || downloading === s.entityId}>
                <DownloadRounded fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          </>}
        </TableCell>
      </TableRow>
    );
  };

  return (
    <Card className="mst-rim mst-assessment-students">
    <Button size="small" aria-pressed={showIds} onClick={()=>setShowIds(v=>!v)}>{showIds?"Hide":"Show"} student IDs</Button>
    <Menu anchorEl={downloadMenu?.anchor} open={Boolean(downloadMenu)} onClose={() => setDownloadMenu(null)}>
      <MenuItem onClick={() => handleDownload('pdf')}>PDF (.pdf)</MenuItem>
      <MenuItem onClick={() => handleDownload('docx')}>Word (.docx)</MenuItem>
    </Menu>
    {sortColumn==='gradeSort' && <Typography variant="caption" sx={{px:2}}>Sorted by percentage; ungraded results last.</Typography>}
    <TableContainer>
      <Table className="mst-responsive-table mst-sortable-table mst-result-records mst-table" aria-label="Student results">
        <TableHead>
          <TableRow>
            {heading("studentName","Student")}
            {showIds && <TableCell>Student ID</TableCell>}
            {heading("statusSort","Status")}
            {heading("gradeSort","Grade")}
            <TableCell align="right" sx={{ width: 168 }}>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rosteredStudents.map(renderStudentRow)}

          {outsiderStudents.length > 0 && (
            <TableRow className="mst-result-group">
              <TableCell
                colSpan={showIds?5:4}
                className="mst-table-group"
              >
                <Typography component="span" variant="overline">{assessmentOnly ? "Students in this assessment" : "Not in the class roster"}</Typography>
              </TableCell>
            </TableRow>
          )}

          {outsiderStudents.map(renderStudentRow)}
        </TableBody>
      </Table>
    </TableContainer>
    </Card>
  );
};

export default ResultsTable;