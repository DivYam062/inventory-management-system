import { useId } from "react";
import { ChevronDown } from "lucide-react";

const Select = ({
  label,
  options = [],
  placeholder = "Select an option",
  error,
  helperText,
  required = false,
  disabled = false,
  fullWidth = true,
  className = "",
  id,
  ...props
}) => {
  const generatedId = useId();
  const selectId = id || generatedId;

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          disabled={disabled}
          required={required}
          aria-invalid={!!error}
          className={`w-full appearance-none rounded-lg border bg-white px-4 py-2.5 pr-10 text-sm text-gray-900 outline-none transition disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 ${
            error
              ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
              : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          } ${className}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={16}
          className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </div>

      {error ? (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
      ) : null}
    </div>
  );
};

export default Select;
