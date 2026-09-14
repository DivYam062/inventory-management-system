import { useId } from "react";

const Input = ({
  label,
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
  const inputId = id || generatedId;

  return (
    <div className={fullWidth ? "w-full" : ""}>
      {label && (
        <label
          htmlFor={inputId}
          className="mb-1 block text-sm font-medium text-gray-700"
        >
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      <input
        id={inputId}
        disabled={disabled}
        required={required}
        aria-invalid={!!error}
        className={`w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
            : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        } ${className}`}
        {...props}
      />

      {error ? (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      ) : helperText ? (
        <p className="mt-1.5 text-sm text-gray-500">{helperText}</p>
      ) : null}
    </div>
  );
};

export default Input;
