// Gives a table its sorted rows, the current sort column and direction, and a requestSort handler for headers.
// Used by the assessment results, class student, student profile and quiz analytics tables.
// Area: platform

import { useMemo, useState } from 'react';
import { sortRows } from '../utils/tableSort';
export default function useTableSort(data, columnConfig, initialSortColumn = null, initialSortDirection = 'asc') {
  const [sortColumn, setSortColumn] = useState(initialSortColumn);
  const [sortDirection, setSortDirection] = useState(initialSortDirection);
  const sortedData = useMemo(
    () => (columnConfig[sortColumn] ? sortRows(data, sortColumn, columnConfig[sortColumn].type, sortDirection) : data),
    [data, columnConfig, sortColumn, sortDirection]
  );
  const requestSort = (key) => {
    if (!columnConfig[key]) return;
    setSortDirection(key === sortColumn && sortDirection === 'asc' ? 'desc' : 'asc');
    setSortColumn(key);
  };
  return { sortedData, requestSort, sortColumn, sortDirection };
}
