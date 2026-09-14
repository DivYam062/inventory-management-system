import { Loader2 } from "lucide-react";

const SIZE_MAP = { sm: 16, md: 24, lg: 32 };

const Spinner = ({ size = "md", className = "" }) => {
  const pixelSize = typeof size === "number" ? size : SIZE_MAP[size] || SIZE_MAP.md;

  return (
    <Loader2 size={pixelSize} className={`animate-spin text-blue-600 ${className}`} />
  );
};

export default Spinner;
