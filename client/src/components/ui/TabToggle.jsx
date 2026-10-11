import { useId, useRef } from "react";

// Segmented control: a short row of options where exactly one is selected - a view switch ("Purchase Orders /
// Direct Deliveries") or a choice in a form ("Purchase Order / Seller & Supplier").
//
//   <TabToggle
//     label="Goods arrive"                       // optional caption above it
//     name="source"
//     options={[{ value: "purchase_order", label: "Purchase Order" }, { value: "direct", label: "Seller & Supplier" }]}
//     value={source}
//     onChange={(event) => setSource(event.target.value)}
//   />
//
// onChange gets an event-like { target: { name, value } }, the same shape as Input, Select and Toggle, so one
// handler can serve a whole form. An option can be { ..., isDisabled: true }. Left / Right arrows (and Home / End)
// move the selection, like a native tab list. Boolean props follow the other components: isDisabled, isFullWidth.
const SIZE_CLASSES = {
  sm: "px-3 py-1 text-xs",
  md: "px-4 py-1.5 text-sm",
};

const TabToggle = ({
  options = [],
  value,
  onChange,
  name,
  label,
  size = "md",
  isDisabled = false,
  isFullWidth = false,
  className = "",
  "aria-label": ariaLabel,
}) => {
  const labelId = useId();
  const buttonRefs = useRef([]);

  const isOptionDisabled = (option) => isDisabled || Boolean(option.isDisabled);
  const selectedIndex = options.findIndex((option) => option.value === value);

  // Only one button is in the tab order (the selected one, or the first enabled one when nothing is selected).
  const focusableIndex = selectedIndex !== -1 && !isOptionDisabled(options[selectedIndex]) ? selectedIndex : options.findIndex((option) => !isOptionDisabled(option));

  const select = (index) => {
    const option = options[index];
    if (!option || isOptionDisabled(option) || option.value === value) return;
    onChange?.({ target: { name, value: option.value } });
  };

  const handleKeyDown = (event, index) => {
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    let next = -1;

    if (step) {
      // The next enabled option in that direction, wrapping around.
      for (let offset = 1; offset <= options.length; offset += 1) {
        const candidate = (index + step * offset + options.length * offset) % options.length;
        if (!isOptionDisabled(options[candidate])) {
          next = candidate;
          break;
        }
      }
    } else if (event.key === "Home") {
      next = options.findIndex((option) => !isOptionDisabled(option));
    } else if (event.key === "End") {
      next = options.map((option) => !isOptionDisabled(option)).lastIndexOf(true);
    } else {
      return;
    }

    event.preventDefault();
    if (next === -1) return;

    buttonRefs.current[next]?.focus();
    select(next);
  };

  return (
    <div className={className}>
      {label && (
        <p id={labelId} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
        </p>
      )}

      <div
        role="tablist"
        aria-labelledby={label ? labelId : undefined}
        aria-label={label ? undefined : ariaLabel}
        className={`rounded-lg bg-gray-100 p-1 ${isFullWidth ? "flex w-full" : "inline-flex w-fit"}`}
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          const disabled = isOptionDisabled(option);

          return (
            <button
              key={String(option.value)}
              ref={(element) => {
                buttonRefs.current[index] = element;
              }}
              type="button"
              role="tab"
              name={name}
              aria-selected={isSelected}
              tabIndex={index === focusableIndex ? 0 : -1}
              disabled={disabled}
              onClick={() => select(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`rounded-md font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-not-allowed disabled:opacity-50 ${
                SIZE_CLASSES[size] ?? SIZE_CLASSES.md
              } ${isFullWidth ? "flex-1" : ""} ${
                isSelected ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TabToggle;
