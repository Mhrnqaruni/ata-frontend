import React from 'react';
import { Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Box, Typography, useTheme } from '@mui/material';
import { useNavigate, useParams } from 'react-router-dom';
import StatusChip from './StatusChip';
import reviewService from '../../services/reviewService';

const ResultsTable = ({ rows }) => {
  const navigate = useNavigate();
  const { job_id } = useParams();
  const theme = useTheme();

  const handleDownload = (entityId) => {
    reviewService.downloadReport(job_id, entityId)
      .catch(err => {
        // Optionally show an error to the user
        console.error(err.message);
      });
  };

  const handleReview = (entityId) => {
    navigate(`/assessments/${job_id}/review/${entityId}`);
  };

  if (!rows || rows.length === 0) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography>No student results are available for this assessment yet.</Typography>
      </Paper>
    );
  }

  const rosteredStudents = rows.filter(s => !s.isOutsider);
  const outsiderStudents = rows.filter(s => s.isOutsider);

  const renderStudentRow = (s) => {
    let gradeText;
    if (s.status === 'PENDING_REVIEW') {
      gradeText = 'Pending';
    } else if (s.status === 'ABSENT') {
      gradeText = 'N/A';
    } else if (s.totalScore != null && s.maxTotalScore != null && s.maxTotalScore > 0) {
      gradeText = `${s.totalScore.toFixed(1)} / ${s.maxTotalScore.toFixed(1)}`;
    } else if (s.totalScore != null) {
      gradeText = s.totalScore.toFixed(1);
    } else {
      gradeText = 'N/A';
    }

    const canReview = s.status !== 'ABSENT';
    const canDownload = s.status !== 'ABSENT' && s.status !== 'PENDING_REVIEW';

    return (
      <TableRow key={s.entityId}>
        <TableCell component="th" scope="row">{s.studentName}</TableCell>
        <TableCell>{s.studentId}</TableCell>
        <TableCell><StatusChip status={s.status} /></TableCell>
        <TableCell align="right">{gradeText}</TableCell>
        <TableCell align="center">
          <Button size="small" variant="outlined" onClick={() => handleReview(s.entityId)} disabled={!canReview} sx={{ mr: 1 }}>
            Review
          </Button>
          <Button size="small" variant="outlined" onClick={() => handleDownload(s.entityId)} disabled={!canDownload}>
            Download
          </Button>
        </TableCell>
      </TableRow>
    );
  };

  return (
    <TableContainer component={Paper}>
      <Table size="small" aria-label="student results table">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Student ID</TableCell>
            <TableCell>Status</TableCell>
            <TableCell align="right">Grade</TableCell>
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rosteredStudents.map(renderStudentRow)}

          {outsiderStudents.length > 0 && (
            <TableRow>
              <TableCell
                colSpan={5}
                sx={{
                  py: 1,
                  backgroundColor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100',
                  fontWeight: 'bold'
                }}
              >
                <Typography variant="subtitle2" sx={{ pl: 2 }}>Students Not in Roster</Typography>
              </TableCell>
            </TableRow>
          )}

          {outsiderStudents.map(renderStudentRow)}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ResultsTable;