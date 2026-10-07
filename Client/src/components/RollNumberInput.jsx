import { useLayoutEffect, useRef } from 'react';
import { formatRollNumber } from '../utils/rollNumber';

function RollNumberInput({ value, onChange, ...inputProps }) {
  const inputRef = useRef(null);
  const pendingCaret = useRef(null);

  useLayoutEffect(() => {
    if (pendingCaret.current === null || !inputRef.current) return;

    const caret = Math.min(pendingCaret.current, value.length);
    inputRef.current.setSelectionRange(caret, caret);
    pendingCaret.current = null;
  }, [value]);

  function handleChange(event) {
    const input = event.currentTarget;
    const formattedValue = formatRollNumber(input.value);
    pendingCaret.current = formatRollNumber(
      input.value.slice(0, input.selectionStart ?? input.value.length),
    ).length;
    onChange(formattedValue);
  }

  return (
    <input
      {...inputProps}
      ref={inputRef}
      type="text"
      value={value}
      maxLength={8}
      onChange={handleChange}
    />
  );
}

export default RollNumberInput;
