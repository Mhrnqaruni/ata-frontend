import { useEffect, useRef, useState } from 'react';

/** Keep the editable draft separate from valid application state.
 * Bounds apply on blur, so clearing or typing a multi-digit value never jumps.
 */
export default function useNumberInput(value, onChange, { defaultValue = 0, min, max, integer = true } = {}) {
  const [draft, setDraft] = useState(value ?? '');
  const focused = useRef(false);
  useEffect(() => { if (!focused.current) setDraft(value ?? ''); }, [value]);
  const constrain = number => Math.min(max ?? Infinity, Math.max(min ?? -Infinity, number));
  return {
    value: draft,
    onFocus: () => { focused.current = true; },
    onChange: event => {
      const text = event.target.value;
      setDraft(text);
      const number = Number(text);
      // Invalid/incomplete drafts never reach saves or API requests.
      if (text !== '' && Number.isFinite(number) && number === constrain(number) && (!integer || Number.isInteger(number))) onChange(number);
    },
    onBlur: event => {
      focused.current = false;
      const text = event.target.value;
      const number = text === '' ? defaultValue : Number(text);
      const valid = Number.isFinite(number) ? number : defaultValue;
      const finalValue = constrain(integer ? Math.trunc(valid) : valid);
      setDraft(finalValue);
      onChange(finalValue);
    }
  };
}
