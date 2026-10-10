import Modal from "../ui/Modal";

// Confirmation prompt built on Modal. `variant` is the Modal variant (danger by default), so a
// destructive confirmation gets the warning icon, tinted header and a red confirm button.
const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  loading = false,
  error = "",
}) => {
  return (
    <Modal
      isOpen={open}
      onClose={loading ? undefined : onClose}
      variant={variant}
      size="sm"
      headerProps={{ heading: title }}
      bodyProps={{ content: message, contentDescription: error || undefined }}
      footerProps={{
        secondaryButton: { text: cancelLabel, onClick: onClose, disabled: loading },
        primaryButton: { text: confirmLabel, onClick: onConfirm, loading },
      }}
    />
  );
};

export default ConfirmDialog;
