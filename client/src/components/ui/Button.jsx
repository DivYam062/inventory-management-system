import { Loader2 } from "lucide-react";

const VARIANT_CLASSES = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 focus-visible:ring-blue-200 disabled:hover:bg-blue-600",
  secondary:
    "bg-gray-100 text-gray-800 hover:bg-gray-200 focus-visible:ring-gray-200 disabled:hover:bg-gray-100",
  outline:
    "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus-visible:ring-gray-200 disabled:hover:bg-white",
  ghost:
    "bg-transparent text-gray-600 hover:bg-gray-100 focus-visible:ring-gray-200 disabled:hover:bg-transparent",
  danger:
    "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-200 disabled:hover:bg-red-600",
};

const SIZE_CLASSES = {
  sm: "h-8 px-3 text-sm gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-base gap-2",
};

const Button = ({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  icon: Icon,
  iconPosition = "left",
  loading = false,
  disabled = false,
  fullWidth = false,
  className = "",
  ...props
}) => {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center rounded-lg font-medium transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${
        VARIANT_CLASSES[variant]
      } ${SIZE_CLASSES[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {!loading && Icon && iconPosition === "left" && <Icon size={16} />}
      {children}
      {!loading && Icon && iconPosition === "right" && <Icon size={16} />}
    </button>
  );
};

export default Button;
