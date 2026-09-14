const VARIANT_CLASSES = {
  gray: "bg-gray-100 text-gray-700",
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  red: "bg-red-50 text-red-600",
  yellow: "bg-yellow-50 text-yellow-700",
  orange: "bg-orange-50 text-orange-600",
};

const Badge = ({ children, variant = "gray", className = "" }) => {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export default Badge;
