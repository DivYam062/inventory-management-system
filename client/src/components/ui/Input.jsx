import { useId, useState } from "react";
import { AlertCircle, Eye, EyeOff, Info } from "lucide-react";
import { applyRestrictions } from "../../utils/inputRestrictions";

// Text input.
//   type="textarea"  renders a textarea (extra props via `textareaProps`)
//   type="password"  adds a show/hide toggle
//   restrictions     clean the value as the user types (see utils/inputRestrictions.js)
//   error/helperText message below the field (error wins); `errorIcon`/`infoIcon` replace the icons
//
// Boolean props follow the Select naming: isRequired, isDisabled, isFullWidth.
// onChange gets the normal change event, with the cleaned value already in event.target.value.
const Input = ({
  label,
  isRequired = false,
  isDisabled = false,
  isFullWidth = true,
  error,
  helperText,
  errorIcon,
  infoIcon,
  restrictions = [],
  textareaProps,
  type = "text",
  className = "",
  id,
  onChange,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || generatedId;

  const [showPassword, setShowPassword] = useState(false);

  const isTextarea = type === "textarea";
  const isPassword = type === "password";
  const inputType = isPassword && showPassword ? "text" : type;

  const hasError = Boolean(error);
  const messageId = hasError ? `${inputId}-error` : helperText ? `${inputId}-info` : undefined;

  const handleChange = (event) => {
    if (restrictions.length > 0) {
      const restricted = applyRestrictions(event.target.value, restrictions);

      if (event.target.value !== restricted) {
        event.target.value = restricted;
      }
    }

    onChange?.(event);
  };

  const fieldClasses = `w-full rounded-lg border px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 ${
    hasError
      ? "border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-100"
      : "border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
  } ${isPassword ? "pr-11" : ""} ${className}`;

  const sharedProps = {
    id: inputId,
    disabled: isDisabled,
    required: isRequired,
    "aria-invalid": hasError,
    "aria-describedby": messageId,
    onChange: handleChange,
    className: fieldClasses,
  };

  return (
    <div className={isFullWidth ? "w-full" : ""}>
      {label && (
        <label htmlFor={inputId} className="mb-1 block text-sm font-medium text-gray-700">
          {label}
          {isRequired && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        {isTextarea ? (
          <textarea rows={3} {...textareaProps} {...props} {...sharedProps} />
        ) : (
          <input type={inputType} {...props} {...sharedProps} />
        )}

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((previous) => !previous)}
            disabled={isDisabled}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 transition hover:text-gray-600 disabled:cursor-not-allowed"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {hasError ? (
        <p id={messageId} role="alert" className="mt-1.5 flex items-start gap-1.5 text-sm text-red-600">
          {errorIcon ?? <AlertCircle size={16} className="mt-0.5 shrink-0" />}
          <span>{error}</span>
        </p>
      ) : helperText ? (
        <p id={messageId} className="mt-1.5 flex items-start gap-1.5 text-sm text-gray-500">
          {infoIcon ?? <Info size={16} className="mt-0.5 shrink-0" />}
          <span>{helperText}</span>
        </p>
      ) : null}
    </div>
  );
};

export default Input;
