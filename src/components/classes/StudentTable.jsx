// /src/components/classes/StudentTable.jsx

// --- Core React Import ---
import React from 'react';
import { useNavigate } from 'react-router-dom';

// --- MUI Component Imports ---
import { Box, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, IconButton, Tooltip, useTheme } from '@mui/material';

// --- Icon Imports ---
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlined from '@mui/icons-material/DeleteOutlineOutlined';
import PersonAddOutlined from '@mui/icons-material/PersonAddOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';

/**
 * A purely presentational component that renders a table of students.
 * It receives the student data and action handlers for editing and deleting as props.
 * It is a "dumb" component that only knows how to display data and delegate events.
 *
 * @param {object} props
 * @param {Array<object>} props.students - The list of student objects to display.
 * @param {function} props.onEdit - Callback function for when the edit button is clicked.
 * @param {function} props.onDelete - Callback function for when the delete button is clicked.
 */
const StudentTable = ({ students, onEdit, onDelete }) => {
  const theme = useTheme();
  const navigate = useNavigate();

  /**
   * A helper function to determine the text color for a grade based on its value.
   * This encapsulates presentational logic within the component.
   */
  const getGradeColor = (grade) => {
    if (grade >= 85) return theme.palette.success.dark;
    if (grade < 70) return theme.palette.error.dark;
    return theme.palette.text.primary;
  };

  // --- Conditional Rendering for the Empty State ---
  // If the students array is empty, we render a helpful message instead of an empty table.
  if (!students || students.length === 0) {
    return (
      <Card>
        <Box sx={{ textAlign: 'center', p: 8 }}>
          <PersonAddOutlined sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h3" gutterBottom>
            No Students in this Class
          </Typography>
          <Typography color="text.secondary">
            Get started by clicking the "Add Student" button to build your roster.
          </Typography>
        </Box>
      </Card>
    );
  }

  return (
    <Card>
      <TableContainer>
        <Table aria-label="student roster table">
          {/* --- Table Header --- */}
          <TableHead sx={{ backgroundColor: theme.palette.grey[100] }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Student ID</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Overall Grade</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>

          {/* --- Table Body --- */}
          <TableBody>
            {students.map((student) => (
              <TableRow
                key={student.id} // The key is critical for React's rendering performance.
                hover // Adds a hover effect to the row.
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  <Typography variant="body1">{student.name}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">{student.studentId}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body1" sx={{ fontWeight: 600, color: getGradeColor(student.overallGrade || 0) }}>
                    {/* The || 0 handles cases where a new student may not have a grade yet. */}
                    {student.overallGrade || 0}% 
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {/* --- Action Delegation Buttons --- */}
                  <Tooltip title="View Profile">
                    <IconButton onClick={() => navigate(`/students/${student.id}`)} aria-label={`view ${student.name} profile`}>
                      <VisibilityOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Edit Student">
                    {/* The onClick handler calls the onEdit prop, passing the specific student object up. */}
                    <IconButton onClick={() => onEdit(student)} aria-label={`edit ${student.name}`}>
                      <EditOutlined fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Remove Student">
                    <IconButton onClick={() => onDelete(student)} aria-label={`remove ${student.name}`}>
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