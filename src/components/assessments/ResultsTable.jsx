// /src/components/assessments/ResultsTable.jsx (FINAL, CONFIRMED, AND CORRECTED)
import React, { useState, useMemo, useCallback } from 'react';
import {
  Box, Card, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TableSortLabel, Typography, IconButton, Tooltip, Chip, useTheme
} from '@mui/material';
import { visuallyHidden } from '@mui/utils';
import PictureAsPdfOutlined from '@mui/icons-material/PictureAsPdfOutlined';
import ShareOutlined from '@mui/icons-material/ShareOutlined';
import CheckCircleOutline from '@mui/icons-material/CheckCircleOutline';
import EditOutlined from '@mui/icons-material/EditOutlined';
import { useSnackbar } from '../../hooks/useSnackbar';

// --- Sorting helper functions ---
function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}
function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}
function stableSort(array, comparator) {
  const stabilizedThis = array.map((el, index) => [el, index]);
  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });
  return stabilizedThis.map((el) => el[0]);
}

const headCells = [
  { id: 'studentName', label: 'Student Name', numeric: false, sortable: true },
  { id: 'finalGrade', label: 'Final Grade', numeric: true, sortable: true },
  { id: 'status', label: 'Status', numeric: false, sortable: true },
  { id: 'actions', label: 'Actions', numeric: false, sortable: false },
];

const EnhancedTableHead = ({ order, orderBy, onRequestSort }) => {
  const createSortHandler = (property) => (event) => {
    onRequestSort(event, property);
  };
  return (
    <TableHead>
      <TableRow>
        {headCells.map((headCell) => (
          <TableCell key={headCell.id} align={headCell.id === 'actions' ? 'right' : 'left'} sortDirection={orderBy === headCell.id ? order : false}>
            {headCell.sortable === false ? ( headCell.label ) : (
              <TableSortLabel active={orderBy === headCell.id} direction={orderBy === headCell.id ? order : 'asc'} onClick={createSortHandler(headCell.id)}>
                {headCell.label}
                {orderBy === headCell.id ? <Box component="span" sx={visuallyHidden}>{order === 'desc' ? 'sorted descending' : 'sorted ascending'}</Box> : null}
              </TableSortLabel>
            )}
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
};


const ResultsTable = ({ tableData, onDownloadReport }) => {
  const { showSnackbar } = useSnackbar();
  const theme = useTheme();
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('finalGrade');

  const handleRequestSort = (_, property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };
  
  const handleShare = useCallback((student) => {
    if (!student.reportToken) {
      showSnackbar('This report does not have a shareable link.', 'warning');
      return;
    }
    const shareLink = `${window.location.origin}/report/${student.reportToken}`;
    navigator.clipboard.writeText(shareLink);
    showSnackbar(`Shareable link for ${student.studentName} copied!`, 'success');
  }, [showSnackbar]);

  const getGradeColor = (grade) => {
    if (grade >= 85) return theme.palette.success.dark;
    if (grade < 70) return theme.palette.error.dark;
    return theme.palette.text.primary;
  };

  const visibleRows = useMemo(() => {
    return stableSort(tableData, getComparator(order, orderBy));
  }, [order, orderBy, tableData]);

  return (
    <Card>
      <TableContainer>
        <Table>
          <EnhancedTableHead order={order} orderBy={orderBy} onRequestSort={handleRequestSort} />
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow hover key={row.studentId}>
                <TableCell><Typography variant="body1" fontWeight={500}>{row.studentName}</Typography></TableCell>
                <TableCell><Typography variant="body1" fontWeight={600} color={getGradeColor(row.finalGrade)}>{row.finalGrade}</Typography></TableCell>
                <TableCell>
                  <Chip label={row.status} color={row.status === 'Edited' ? 'warning' : 'success'} size="small" variant="outlined" icon={row.status === 'Edited' ? <EditOutlined fontSize="small"/> : <CheckCircleOutline fontSize="small"/>} />
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="Copy Shareable Link"><IconButton onClick={() => handleShare(row)}><ShareOutlined /></IconButton></Tooltip>
                  <Tooltip title="Download Report (.docx)"><IconButton onClick={() => onDownloadReport(row.studentId)}><PictureAsPdfOutlined /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Card>
  );
};
export default ResultsTable;