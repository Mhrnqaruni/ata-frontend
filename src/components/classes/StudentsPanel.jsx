// The Students tab on the Classes page (Phase 1.48, design §3.2): every student in the workspace, in a class or not,
// found by name or ID, with View profile and Edit (the name and ID). Students are added in a class, so there's no Add.
// Area: academics

import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  IconButton,
  InputAdornment,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import CloseRounded from '@mui/icons-material/CloseRounded';
import EditOutlined from '@mui/icons-material/EditOutlined';
import PeopleAltOutlined from '@mui/icons-material/PeopleAltOutlined';
import SearchRounded from '@mui/icons-material/SearchRounded';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import { useAuth } from '../../hooks/useAuth';
import { useSnackbar } from '../../hooks/useSnackbar';
import useTableSort from '../../hooks/useTableSort';
import { sessionGeneration } from '../../services/queryCache';
import studentService from '../../services/studentService';
import EmptyState from '../common/EmptyState';
import QueryNotice from '../common/QueryNotice';
import StudentModal from './StudentModal';
import { initialsOf } from './StudentTable';
import '../common/responsive-table.css';
import './students-panel.css';

const COLUMNS = { name: { type: 'string' }, studentId: { type: 'string' } };

// Lower case with the accents taken off, so "zoe" finds "Zoë" (SOT-4.3).
const fold = (text) =>
  String(text ?? '')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();

// "8B Science, 9C Science", then "+2" for any more (design §3.2).
const classWords = (classes) => {
  const names = classes
    .slice(0, 2)
    .map((item) => item.name)
    .join(', ');
  return classes.length > 2 ? `${names} +${classes.length - 2}` : names;
};

// The quiz library's filter-chip look: a 32 px pill, in the accent tint while it's on.
const chipLook = (on) => ({
  height: 32,
  fontSize: 14,
  fontWeight: 500,
  fontVariantNumeric: 'tabular-nums',
  border: '1px solid',
  borderColor: on ? 'transparent' : 'var(--mst-edge-control)',
  bgcolor: on ? 'var(--mst-accent-tint)' : 'var(--mst-well)',
  color: on ? 'var(--mst-accent-ink)' : 'var(--mst-ink)',
  '& .MuiChip-label': { pl: 1.5, pr: on ? 1 : 1.5 },
  '& .MuiChip-deleteIcon': { color: 'inherit', fontSize: 18, mr: 0.75, '&:hover': { color: 'inherit', opacity: 0.75 } },
  '&.MuiChip-clickable:hover': { bgcolor: on ? 'var(--mst-accent-tint)' : 'var(--mst-row-hover)' },
});

const stop = (handler) => (event) => {
  event.stopPropagation();
  handler();
};

// One student: a row click or the name opens the profile; on a phone it's two lines (students-panel.css).
const StudentRow = memo(function StudentRow({ student, onEdit }) {
  const navigate = useNavigate();
  const profile = `/students/${student.id}`;
  const { classes } = student;
  return (
    <TableRow className="mst-row-link" onClick={() => navigate(profile)}>
      <TableCell component="th" data-label="Student" scope="row">
        <span className="mst-person">
          <span aria-hidden="true" className="mst-avatar">
            {initialsOf(student.name)}
          </span>
          <RouterLink className="mst-person-name" onClick={(event) => event.stopPropagation()} to={profile}>
            {student.name}
          </RouterLink>
        </span>
      </TableCell>
      <TableCell className="mst-cell-muted" data-label="Student ID">
        {student.studentId}
      </TableCell>
      <TableCell
        data-label="Classes"
        title={classes.length > 2 ? classes.map((item) => item.name).join(', ') : undefined}
      >
        {classes.length ? classWords(classes) : <span className="mst-students-none">No class</span>}
      </TableCell>
      <TableCell align="right" className="mst-row-actions" data-label="Actions" sx={{ px: 1 }}>
        <Tooltip title="View profile">
          <IconButton
            aria-label={`View ${student.name}'s profile`}
            className="mst-students-view"
            onClick={stop(() => navigate(profile))}
          >
            <VisibilityOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit student">
          <IconButton aria-label={`Edit ${student.name}`} onClick={stop(() => onEdit(student))}>
            <EditOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </TableCell>
    </TableRow>
  );
});

// onCreateClass: opens Create a class, for the empty state.
export default function StudentsPanel({ onCreateClass }) {
  const { user } = useAuth();
  const { showSnackbar } = useSnackbar();
  const query = useQuery({
    queryKey: ['teacher', sessionGeneration(), user?.id, 'students'],
    queryFn: ({ signal }) => studentService.list(signal),
    enabled: Boolean(user?.id),
  });
  const [search, setSearch] = useState('');
  const [noClassOnly, setNoClassOnly] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState(null);

  // Each student once, with the folded words the search compares, so typing stays quick with hundreds.
  const students = useMemo(
    () =>
      (query.data || []).map((student) => ({
        ...student,
        classes: student.classes || [],
        words: [fold(student.name), fold(student.studentId)],
      })),
    [query.data]
  );
  const noClassCount = students.filter((student) => !student.classes.length).length;
  const noClassOn = noClassOnly && noClassCount > 0; // the chip goes when the last such student gets a class
  const deferredSearch = useDeferredValue(search); // the field follows each key; the list a moment later
  const typed = fold(deferredSearch.trim());
  const visible = useMemo(
    () =>
      students.filter(
        (student) =>
          (!noClassOn || !student.classes.length) && (!typed || student.words.some((word) => word.includes(typed)))
      ),
    [students, noClassOn, typed]
  );
  const { sortedData, requestSort, sortColumn, sortDirection } = useTableSort(visible, COLUMNS, 'name', 'asc');
  const total = students.length;
  const count =
    noClassOn || typed ? `${visible.length} of ${total}` : `${total} ${total === 1 ? 'student' : 'students'}`;

  const openEdit = useCallback((student) => {
    setEditError(null);
    setEditing(student);
  }, []);
  // The save refreshes this list and every class page (studentService); the dialog keeps what was typed on an error.
  const save = async ({ name, studentId }) => {
    setSaving(true);
    setEditError(null);
    try {
      await studentService.update(editing.id, { name: name.trim(), studentId: studentId.trim() });
      setEditing(null);
      showSnackbar('Student updated.', 'success');
    } catch (error) {
      setEditError(error.message);
    } finally {
      setSaving(false);
    }
  };

  const sortable = (key, label) => (
    <TableSortLabel
      active={sortColumn === key}
      direction={sortColumn === key ? sortDirection : 'asc'}
      onClick={() => requestSort(key)}
    >
      {label}
    </TableSortLabel>
  );

  const renderList = () => {
    if (query.isPending) {
      return (
        <Box aria-label="Loading students" role="status" sx={{ display: 'grid', gap: 1 }}>
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton height={56} key={index} variant="rounded" />
          ))}
        </Box>
      );
    }
    if (!query.data) return null; // the first load failed: QueryNotice says so, with Retry
    if (!total) {
      return (
        <EmptyState
          action={
            <Button onClick={onCreateClass} startIcon={<AddOutlined />} variant="contained">
              Create class
            </Button>
          }
          icon={<PeopleAltOutlined />}
          title="No students yet"
        >
          Students appear here when you add them to a class.
        </EmptyState>
      );
    }
    return (
      <>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          <TextField
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchRounded sx={{ fontSize: 20, color: 'var(--mst-ink-2)' }} />
                </InputAdornment>
              ),
            }}
            inputProps={{ 'aria-label': 'Search by name or ID', enterKeyHint: 'search', maxLength: 100 }}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name or ID"
            size="small"
            sx={{ flex: { xs: '1 1 100%', sm: '0 1 360px' } }}
            value={search}
          />
          {noClassCount > 0 ? (
            <Chip
              aria-pressed={noClassOn}
              deleteIcon={<CloseRounded titleAccess="Show every student" />}
              label={`No class (${noClassCount})`}
              onClick={() => setNoClassOnly(!noClassOn)}
              onDelete={noClassOn ? () => setNoClassOnly(false) : undefined}
              sx={chipLook(noClassOn)}
            />
          ) : null}
          <Typography
            aria-live="polite"
            sx={{ ml: 'auto', color: 'var(--mst-ink-2)', fontVariantNumeric: 'tabular-nums' }}
            variant="body2"
          >
            {count}
          </Typography>
        </Box>
        {sortedData.length ? (
          <Card className="mst-rim">
            <TableContainer>
              <Table aria-label="Students" className="mst-responsive-table mst-table mst-students-table">
                <TableHead>
                  <TableRow>
                    <TableCell sortDirection={sortColumn === 'name' ? sortDirection : false} sx={{ width: '36%' }}>
                      {sortable('name', 'Student')}
                    </TableCell>
                    <TableCell sortDirection={sortColumn === 'studentId' ? sortDirection : false} sx={{ width: '20%' }}>
                      {sortable('studentId', 'Student ID')}
                    </TableCell>
                    <TableCell>Classes</TableCell>
                    <TableCell align="right" sx={{ width: 104 }}>
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedData.map((student) => (
                    <StudentRow key={student.id} onEdit={openEdit} student={student} />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        ) : (
          <Alert
            action={
              <Button color="inherit" onClick={() => setSearch('')} size="small">
                Clear search
              </Button>
            }
            severity="info"
          >
            No student matches “{search.trim()}”
          </Alert>
        )}
      </>
    );
  };

  return (
    <Box sx={{ display: 'grid', gap: 2 }}>
      <QueryNotice label="students" query={query} />
      {renderList()}
      <StudentModal
        error={editError}
        initialData={editing}
        isLoading={saving}
        mode="edit"
        onClose={() => (saving ? undefined : setEditing(null))}
        onSubmit={save}
        open={Boolean(editing)}
      />
    </Box>
  );
}
