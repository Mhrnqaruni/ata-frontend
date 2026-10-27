import '../common/responsive-table.css';
// /src/components/classes/StudentTable.jsx
// The class roster in a glass table: initials avatar + name (a link to the profile), ID, the overall grade with
// a small bar, and row actions that brighten on hover. Clicking a row also opens the student's profile.

import React, { useState, useEffect } from 'react';
import tagService from '../../services/tagService';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Chip, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel, IconButton, Tooltip } from '@mui/material';
import useTableSort from '../../hooks/useTableSort';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import EmptyState from '../common/EmptyState';

export const initialsOf = (name = '') =>
  name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || '?';

export const GradeCell = ({ value }) =>
  value == null ? (
    <span className="mst-grade-none">Not available</span>
  ) : (
    <span className="mst-grade" data-band={value >= 85 ? 'high' : value < 70 ? 'low' : 'mid'}>
      <span className="mst-grade-value">{value}%</span>
      <span aria-hidden="true" className="mst-grade-bar"><span style={{ transform: `scaleX(${Math.max(0, Math.min(100, value)) / 100})` }} /></span>
    </span>
  );

const stop = (handler) => (event) => {
  event.stopPropagation();
  handler();
};

const StudentTable = ({ students, onEdit, onDelete, onProgressTracker }) => {
  const navigate = useNavigate();
  const [tagMap,setTagMap]=useState({});
  useEffect(()=>{let active=true;tagService.list().then(data=>{if(active)setTagMap(Object.fromEntries(data.students.map(s=>[s.id,s.tags])));}).catch(()=>{});return()=>{active=false;};},[]);
  const columnConfig = {
    name: { type: 'string' },
    studentId: { type: 'string' },
    overallGrade: { type: 'percentage' }
  };
  const { sortedData, requestSort, sortColumn, sortDirection } = useTableSort(students || [], columnConfig, 'name', 'asc');

  if (!students || students.length === 0) {
    return (
      <EmptyState icon={<PersonAddOutlined />} title="No students in this class yet">
        Use "Add student" to build the roster.
      </EmptyState>
    );
  }

  const sortable = (key, label) => (
    <TableSortLabel active={sortColumn === key} direction={sortColumn === key ? sortDirection : 'asc'} onClick={() => requestSort(key)}>
      {label}
    </TableSortLabel>
  );

  return (
    <Card className="mst-rim">
      <TableContainer>
        <Table className="mst-responsive-table mst-sortable-table mst-table" aria-label="Student roster">
          <TableHead>
            <TableRow>
              <TableCell sx={{ width: '42%' }}>{sortable('name', 'Student')}</TableCell>
              <TableCell>{sortable('studentId', 'Student ID')}</TableCell>
              <TableCell>{sortable('overallGrade', 'Overall grade')}</TableCell>
              <TableCell align="right" sx={{ width: 196 }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.map((student) => (
              <TableRow className="mst-row-link" key={student.id} onClick={() => navigate(`/students/${student.id}`)}>
                <TableCell component="th" data-label="Student" scope="row">
                  <span className="mst-person">
                    <span aria-hidden="true" className="mst-avatar">{initialsOf(student.name)}</span>
                    <RouterLink className="mst-person-name" onClick={(event) => event.stopPropagation()} to={`/students/${student.id}`}>{student.name}</RouterLink>
                  </span>
                  <span style={{display:'flex',gap:4,flexWrap:'wrap'}}>{(tagMap[student.id]||[]).map(t=><Chip key={t.id} size="small" label={t.name}/>)}</span>
                </TableCell>
                <TableCell className="mst-cell-muted" data-label="Student ID">{student.studentId}</TableCell>
                <TableCell data-label="Overall grade"><GradeCell value={student.overallGrade} /></TableCell>
                <TableCell align="right" className="mst-row-actions" data-label="Actions">
                  <Tooltip title="View profile">
                    <IconButton aria-label={`View ${student.name}'s profile`} onClick={stop(() => navigate(`/students/${student.id}`))}>
                      <VisibilityOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Progress tracker with AI">
                    <IconButton aria-label={`Track ${student.name}'s progress with AI`} className="mst-ai-icon" onClick={stop(() => onProgressTracker(student))}>
                      <TrendingUpIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit student">
                    <IconButton aria-label={`Edit ${student.name}`} onClick={stop(() => onEdit(student))}>
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove student">
                    <IconButton aria-label={`Remove ${student.name}`} onClick={stop(() => onDelete(student))}>
                      <DeleteOutlineOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};

export default StudentTable;
