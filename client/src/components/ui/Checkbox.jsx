import { useEffect, useId, useRef } from "react";
import { Check, Minus } from "lucide-react";

// Checkbox with an optional label and an "indeterminate" (some, not all) state.
//   <Checkbox label="Create" name="create" isChecked={on} onChange={handle} />
//   <Checkbox aria-label="Select all" isChecked={all} isIndeterminate={some} onChange={handle} />
//
// onChange gets an event-like { target: { name, value, checked } } (value and checked are both the new
// boolean), the same shape as Input, Select and Toggle.
const Checkbox = ({
  label,
  name,
  isChecked = false,
  isIndeterminate = false,
  isDisabled = false,
  onChange,
  title,
  className = "",
  id,
  "aria-label": ariaLabel,
}) => {
  const generatedId = useId();
  const checkboxId = id || generatedId;
  const inputRef = useRef(null);

  // `indeterminate` is a DOM property, not an attribute.
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = isIndeterminate && !isChecked;
  }, [isIndeterminate, isChecked]);

  return (
    <label
      htmlFor={checkboxId}
      title={title}
      className={`inline-flex items-center gap-2.5 text-sm ${
        isDisabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"
      } ${className}`}
    >
      {/* The real input stays in the DOM (keyboard, forms, screen readers); only its look is replaced. */}
      <span className="relative inline-flex h-4.5 w-4.5 shrink-0">
        <input
          ref={inputRef}
          id={checkboxId}
          type="checkbox"
          name={name}
          checked={isChecked}
          disabled={isDisabled}
          aria-label={label ? undefined : ariaLabel}
          onChange={(e) => onChange?.({ target: { name, value: e.target.checked, checked: e.target.checked } })}
          className="peer absolute inset-0 m-0 h-full w-full cursor-[inherit] appearance-none rounded-[5px] border border-gray-300 bg-white transition hover:border-gray-400 checked:border-blue-600 checked:bg-blue-600 indeterminate:border-blue-600 indeterminate:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
        />
        <Check
          size={13}
          strokeWidth={3}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto text-white opacity-0 transition-opacity peer-checked:opacity-100"
        />
        <Minus
          size={13}
          strokeWidth={3}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 m-auto text-white opacity-0 transition-opacity peer-indeterminate:opacity-100"
        />
      </span>

      {label && <span className="select-none text-gray-700">{label}</span>}
    </label>
  );
};

export default Checkbox;
