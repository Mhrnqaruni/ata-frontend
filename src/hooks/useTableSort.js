// /src/hooks/useTableSort.js

import { useState, useMemo } from 'react';

/**
 * Custom hook for sortable tables with type-aware comparison
 *
 * Supports multiple data types:
 * - 'number': Numeric values
 * - 'string': Text (case-insensitive)
 * - 'date': Date objects or ISO strings
 * - 'percentage': Values with or without % symbol
 * - 'time': Time strings like "5m 30s" (converted to seconds)
 *
 * @param {Array} data - Array of objects to sort
 * @param {Object} config - Column configuration
 * @param {string} config.key - Property key to sort by (supports nested like "student.name")
 * @param {string} config.type - Data type: 'number' | 'string' | 'date' | 'percentage' | 'time'
 * @param {string} initialSortColumn - Initial column to sort by (optional)
 * @param {string} initialSortDirection - Initial direction: 'asc' | 'desc' (default: 'asc')
 *
 * @returns {Object} { sortedData, requestSort, sortColumn, sortDirection }
 *
 * @example
 * const columns = {
 *   name: { type: 'string' },
 *   score: { type: 'number' },
 *   date: { type: 'date' }
 * };
 *
 * const { sortedData, requestSort, sortColumn, sortDirection } =
 *   useTableSort(students, columns, 'score', 'desc');
 */
function useTableSort(data, columnConfig, initialSortColumn = null, initialSortDirection = 'asc') {
  const [sortColumn, setSortColumn] = useState(initialSortColumn);
  const [sortDirection, setSortDirection] = useState(initialSortDirection);

  /**
   * Get nested property value from object using dot notation
   * e.g., getNestedValue({ user: { name: 'John' } }, 'user.name') => 'John'
   */
  const getNestedValue = (obj, path) => {
    if (!path) return obj;
    return path.split('.').reduce((acc, part) => acc?.[part], obj);
  };

  /**
   * Parse percentage to normalized number (0-100 scale)
   * Handles multiple formats:
   * - Decimal (0-1): 0.85 => 85
   * - Whole number (0-100): 85 => 85
   * - String with %: "85%" => 85
   * - String without %: "85" => 85
   */
  const parsePercentage = (value) => {
    if (value === null || value === undefined) return null;

    let num;

    if (typeof value === 'number') {
      num = value;
    } else {
      const str = String(value).trim();
      const numStr = str.replace('%', '');
      num = parseFloat(numStr);
    }

    if (isNaN(num)) return null;

    // Normalize: if number is between 0-1, assume it's a decimal percentage
    // and convert to 0-100 scale
    if (num >= 0 && num <= 1) {
      return num * 100;
    }

    // Already in 0-100 scale (or above 100, which we'll allow)
    return num;
  };

  /**
   * Parse time string to total seconds
   * e.g., "5m 30s" => 330, "2h 15m" => 8100
   */
  const parseTimeToSeconds = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;

    const str = String(value).trim();
    let totalSeconds = 0;

    // Match hours (e.g., "2h")
    const hoursMatch = str.match(/(\d+)h/);
    if (hoursMatch) {
      totalSeconds += parseInt(hoursMatch[1], 10) * 3600;
    }

    // Match minutes (e.g., "5m")
    const minutesMatch = str.match(/(\d+)m/);
    if (minutesMatch) {
      totalSeconds += parseInt(minutesMatch[1], 10) * 60;
    }

    // Match seconds (e.g., "30s")
    const secondsMatch = str.match(/(\d+)s/);
    if (secondsMatch) {
      totalSeconds += parseInt(secondsMatch[1], 10);
    }

    return totalSeconds;
  };

  /**
   * Parse date value to timestamp
   */
  const parseDate = (value) => {
    if (value === null || value === undefined) return null;
    if (value instanceof Date) return value.getTime();

    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date.getTime();
  };

  /**
   * Type-aware comparison function
   */
  const compareValues = (a, b, columnKey, type) => {
    let aVal = getNestedValue(a, columnKey);
    let bVal = getNestedValue(b, columnKey);

    // Handle null/undefined - always push to bottom regardless of sort direction
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    // Type-specific comparison
    switch (type) {
      case 'number':
        aVal = typeof aVal === 'number' ? aVal : parseFloat(aVal);
        bVal = typeof bVal === 'number' ? bVal : parseFloat(bVal);

        // Handle NaN
        if (isNaN(aVal)) return 1;
        if (isNaN(bVal)) return -1;

        return aVal - bVal;

      case 'percentage':
        aVal = parsePercentage(aVal);
        bVal = parsePercentage(bVal);

        if (aVal === null) return 1;
        if (bVal === null) return -1;

        return aVal - bVal;

      case 'time':
        aVal = parseTimeToSeconds(aVal);
        bVal = parseTimeToSeconds(bVal);

        if (aVal === null) return 1;
        if (bVal === null) return -1;

        return aVal - bVal;

      case 'date':
        aVal = parseDate(aVal);
        bVal = parseDate(bVal);

        if (aVal === null) return 1;
        if (bVal === null) return -1;

        return aVal - bVal;

      case 'string':
      default:
        // Case-insensitive string comparison
        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();

        return aStr.localeCompare(bStr);
    }
  };

  /**
   * Sort the data array
   */
  const sortedData = useMemo(() => {
    if (!sortColumn || !columnConfig[sortColumn]) {
      return data;
    }

    const config = columnConfig[sortColumn];
    const sorted = [...data].sort((a, b) => {
      const comparison = compareValues(a, b, sortColumn, config.type);
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [data, sortColumn, sortDirection, columnConfig]);

  /**
   * Handle sort request for a column
   * Clicking same column toggles direction: asc -> desc -> asc
   * Clicking different column resets to asc
   */
  const requestSort = (columnKey) => {
    if (!columnConfig[columnKey]) {
      console.warn(`useTableSort: Column "${columnKey}" not found in config`);
      return;
    }

    if (sortColumn === columnKey) {
      // Toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New column, default to ascending
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  return {
    sortedData,
    requestSort,
    sortColumn,
    sortDirection
  };
}

export default useTableSort;
