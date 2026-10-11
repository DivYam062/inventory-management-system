import { useEffect, useId, useRef } from "react";
import { createPortal } from "react-dom";
import { Info, TriangleAlert, X } from "lucide-react";
import Button from "./Button";

// Accessible dialog: portalled to <body>, focuses itself on open, restores focus on close,
// closes on Escape or an outside click, and locks page scroll while open.
//
//   <Modal
//     isOpen={open}
//     onClose={close}
//     variant="danger"                       // default | info | warning | danger
//     size="md"                              // sm | md | lg | xl | 2xl
//     headerProps={{ heading, subHeading, icon: Trash2, customHeader, disableVariantStyle }}
//     bodyProps={{ content, contentDescription, customContent, disableVariantStyle }}
//     footerProps={{ primaryButton, secondaryButton, disableVariantStyle }}
//   >
//     children render in the body when no content/contentDescription is given
//   </Modal>
//
// Buttons are { text, ...Button props }, e.g. { text: "Save", loading, type: "submit", form: "my-form" }.
// The header shows a round icon: `headerProps.icon` (a Lucide icon component) wins, otherwise
// info/warning/danger get their default icon. `disableVariantStyle` turns the variant colors
// off for that section. A danger variant makes the primary button a danger button.

const SIZE_CLASSES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  "2xl": "max-w-4xl", // wide forms with a table inside (e.g. purchase order items)
};

const VARIANT_ICONS = {
  info: Info,
  warning: TriangleAlert,
  danger: TriangleAlert,
};

const VARIANT_STYLES = {
  default: {
    header: "",
    icon: "bg-gray-100 text-gray-600",
    description: "text-gray-600",
  },
  info: {
    header: "bg-blue-50/60",
    icon: "bg-blue-100 text-blue-600",
    description: "text-blue-700",
  },
  warning: {
    header: "bg-yellow-50/70",
    icon: "bg-yellow-100 text-yellow-700",
    description: "text-yellow-800",
  },
  danger: {
    header: "bg-red-50/60",
    icon: "bg-red-100 text-red-600",
    description: "text-red-700",
  },
};

const ModalFooterButton = ({ text, ...buttonProps }) => (
  <Button {...buttonProps}>{text}</Button>
);

const Modal = ({
  isOpen,
  onClose,
  children,
  headerProps,
  bodyProps,
  footerProps,
  variant = "default",
  size = "md",
  className = "",
}) => {
  const titleId = useId();
  const bodyId = useId();
  const dialogRef = useRef(null);

  // Keep the latest onClose without re-running the open/close effect on every render.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement;
    dialogRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCloseRef.current?.();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const { heading, subHeading, icon, customHeader, disableVariantStyle: headerIsPlain } = headerProps ?? {};
  const { content, contentDescription, customContent, disableVariantStyle: bodyIsPlain } = bodyProps ?? {};
  const { primaryButton, secondaryButton, disableVariantStyle: footerIsPlain } = footerProps ?? {};

  const hasFooter = Boolean(primaryButton || secondaryButton);
  const hasBodyContent = Boolean(customContent || content || contentDescription || children);

  const headerStyle = VARIANT_STYLES[headerIsPlain ? "default" : variant] ?? VARIANT_STYLES.default;
  const bodyStyle = VARIANT_STYLES[bodyIsPlain ? "default" : variant] ?? VARIANT_STYLES.default;

  const HeaderIcon = icon ?? (headerIsPlain ? undefined : VARIANT_ICONS[variant]);

  // Only danger has a matching Button color; other variants keep the button's own color.
  const autoPrimaryVariant = !footerIsPlain && variant === "danger" ? "danger" : undefined;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 sm:p-6"
      onMouseDown={(event) => {
        // Outside click: only when the press started on the overlay itself, so selecting text in
        // a field and releasing outside the dialog does not close it.
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={customHeader || !heading ? undefined : titleId}
        aria-describedby={hasBodyContent ? bodyId : undefined}
        tabIndex={-1}
        className={`relative flex max-h-full w-full flex-col ${SIZE_CLASSES[size] ?? SIZE_CLASSES.md} rounded-xl bg-white shadow-xl outline-none ${className}`}
      >
        <div
          className={`flex shrink-0 items-start justify-between gap-4 rounded-t-xl border-b border-gray-100 px-6 py-4 ${headerStyle.header}`}
        >
          {customHeader ?? (
            <div className="flex min-w-0 items-center gap-3">
              {HeaderIcon && (
                <span
                  aria-hidden="true"
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${headerStyle.icon}`}
                >
                  <HeaderIcon size={20} />
                </span>
              )}

              <div className="min-w-0">
                {heading && (
                  <h2 id={titleId} className="text-lg font-semibold text-gray-900">
                    {heading}
                  </h2>
                )}
                {subHeading && <p className="mt-0.5 text-sm text-gray-500">{subHeading}</p>}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="shrink-0 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>

        <div id={bodyId} className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {customContent ?? (
            <>
              {content && <div className="text-sm text-gray-700">{content}</div>}
              {contentDescription && (
                <p className={`text-sm ${content ? "mt-2" : ""} ${bodyStyle.description}`}>
                  {contentDescription}
                </p>
              )}
              {!content && !contentDescription && children}
            </>
          )}
        </div>

        {hasFooter && (
          <div className="flex shrink-0 items-center justify-end gap-3 rounded-b-xl border-t border-gray-100 px-6 py-4">
            {secondaryButton && <ModalFooterButton variant="outline" {...secondaryButton} />}
            {primaryButton && (
              <ModalFooterButton
                {...(autoPrimaryVariant ? { variant: autoPrimaryVariant } : undefined)}
                {...primaryButton}
              />
            )}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default Modal;
