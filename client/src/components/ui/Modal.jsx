import { useEffect } from "react";
import { X } from "lucide-react";

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

const Modal = ({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
  closeOnBackdropClick = true,
}) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/50 px-4 py-6">
      <div
        className="absolute inset-0"
        onClick={closeOnBackdropClick ? onClose : undefined}
      />

      <div
        className={`relative w-full ${SIZE_CLASSES[size]} rounded-xl bg-white shadow-xl`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        )}

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>

        {footer && (
          <div className="flex items-center justify-end gap-3 border-t border-gray-100 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
