import { useId } from "react";

// On/off switch.
//   <Toggle label="Use Custom Colors" name="useCustomColors" isChecked={on} onChange={handle} />
//
// onChange gets an event-like { target: { name, value, checked } } (value and checked are both
// the new boolean), the same shape as Input and Select, so one handler can serve a whole form.
const SIZE_CLASSES = {
  // The thumb sits 2px inside the track on both sides: travel = track width - thumb width - 4px.
  sm: { track: "h-5 w-9", thumb: "h-4 w-4", on: "translate-x-[1rem]" },
  md: { track: "h-6 w-11", thumb: "h-5 w-5", on: "translate-x-[1.25rem]" },
};

const Toggle = ({
  label,
  name,
  isChecked = false,
  isDisabled = false,
  onChange,
  size = "md",
  className = "",
  id,
  "aria-label": ariaLabel,
}) => {
  const generatedId = useId();
  const toggleId = id || generatedId;
  const sizes = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;

  const handleClick = () => {
    if (isDisabled) return;
    const next = !isChecked;
    onChange?.({ target: { name, value: next, checked: next } });
  };

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <button
        id={toggleId}
        type="button"
        role="switch"
        name={name}
        aria-checked={isChecked}
        aria-label={label ? undefined : ariaLabel}
        disabled={isDisabled}
        onClick={handleClick}
        className={`relative inline-flex shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50 ${sizes.track} ${
          isChecked ? "bg-blue-600" : "bg-gray-300"
        } ${isDisabled ? "" : "cursor-pointer"}`}
      >
        <span
          aria-hidden="true"
          className={`absolute left-0.5 top-0.5 rounded-full bg-white shadow transition-transform ${sizes.thumb} ${
            isChecked ? sizes.on : ""
          }`}
        />
      </button>

      {label && (
        <label
          htmlFor={toggleId}
          className={`select-none text-sm font-medium text-gray-700 ${
            isDisabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
          }`}
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default Toggle;
