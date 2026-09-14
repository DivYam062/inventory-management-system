import Badge from "../ui/Badge";

const STATUS_CONFIG = {
  active: { label: "Active", variant: "green" },
  inactive: { label: "Inactive", variant: "gray" },
  "low-stock": { label: "Low Stock", variant: "yellow" },
  "out-of-stock": { label: "Out of Stock", variant: "red" },
  "stock-in": { label: "Stock In", variant: "green" },
  "stock-out": { label: "Stock Out", variant: "orange" },
  pending: { label: "Pending", variant: "yellow" },
  success: { label: "Success", variant: "green" },
  error: { label: "Error", variant: "red" },
};

const StatusBadge = ({ status, label, className = "" }) => {
  const key = String(status).toLowerCase().replace(/_/g, "-");
  const config = STATUS_CONFIG[key] || { label: status, variant: "gray" };

  return (
    <Badge variant={config.variant} className={className}>
      {label || config.label}
    </Badge>
  );
};

export default StatusBadge;
