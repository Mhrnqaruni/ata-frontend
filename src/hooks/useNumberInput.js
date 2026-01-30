// /src/hooks/useNumberInput.js

import { useState, useEffect } from 'react';

/**
 * Custom hook for number inputs that allows temporary empty state
 *
 * This fixes the common UX issue where users cannot clear number input fields
 * because onChange handlers immediately convert empty strings to default values.
 *
 * @param {number} value - Current numeric value from parent state
 * @param {function} onChange - Parent's onChange handler (receives valid number only)
 * @param {object} options - Configuration options
 * @param {number} options.defaultValue - Value to revert to when empty on blur (required)
 * @param {number} [options.min] - Minimum allowed value (optional)
 * @param {number} [options.max] - Maximum allowed value (optional)
 *
 * @returns {object} Props to spread onto TextField: { value, onChange, onBlur }
 *
 * @example
 * const pointsProps = useNumberInput(points, setPoints, {
 *   defaultValue: 10,
 *   min: 0,
 *   max: 100
 * });
 *
 * <TextField
 *   type="number"
 *   label="Points"
 *   {...pointsProps}
 *   InputProps={{ inputProps: { min: 0, max: 100 } }}
 * />
 */
function useNumberInput(value, onChange, { defaultValue, min, max } = {}) {
  // Internal display state - can be empty string temporarily
  const [displayValue, setDisplayValue] = useState(() =>
    value !== null && value !== undefined ? value.toString() : ''
  );

  // Sync display value when parent value changes externally
  useEffect(() => {
    const newDisplayValue = value !== null && value !== undefined ? value.toString() : '';
    setDisplayValue(newDisplayValue);
  }, [value]);

  const handleChange = (e) => {
    const inputValue = e.target.value;

    // Always update display to allow user to type/delete freely
    setDisplayValue(inputValue);

    // If empty or just a minus sign, don't call parent yet (wait for blur)
    if (inputValue === '' || inputValue === '-') {
      return;
    }

    // Parse the input value
    const numValue = parseInt(inputValue, 10);

    // Only call parent onChange if we have a valid number
    if (!isNaN(numValue)) {
      // Apply min/max constraints if provided
      let constrainedValue = numValue;

      if (min !== undefined && numValue < min) {
        constrainedValue = min;
      }
      if (max !== undefined && numValue > max) {
        constrainedValue = max;
      }

      // Call parent with valid, constrained number
      onChange(constrainedValue);
    }
  };

  const handleBlur = (e) => {
    const inputValue = e.target.value;

    // If empty or just a minus sign, revert to default value
    if (inputValue === '' || inputValue === '-') {
      const revertValue = defaultValue !== undefined ? defaultValue : 0;
      setDisplayValue(revertValue.toString());
      onChange(revertValue);
      return;
    }

    // Parse final value
    const numValue = parseInt(inputValue, 10);

    if (isNaN(numValue)) {
      // Invalid input, revert to default
      const revertValue = defaultValue !== undefined ? defaultValue : 0;
      setDisplayValue(revertValue.toString());
      onChange(revertValue);
    } else {
      // Apply min/max constraints
      let finalValue = numValue;

      if (min !== undefined && numValue < min) {
        finalValue = min;
      }
      if (max !== undefined && numValue > max) {
        finalValue = max;
      }

      // Update display to show constrained value
      setDisplayValue(finalValue.toString());

      // Ensure parent has the constrained value
      if (finalValue !== numValue) {
        onChange(finalValue);
      }
    }
  };

  return {
    value: displayValue,
    onChange: handleChange,
    onBlur: handleBlur
  };
}

export default useNumberInput;
