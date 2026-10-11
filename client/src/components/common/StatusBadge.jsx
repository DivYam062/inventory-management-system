import Badge from "../ui/Badge";

const STATUS_CONFIG = {
  active: { label: "Active", variant: "green" },
  inactive: { label: "Inactive", variant: "gray" },
  "in-stock": { label: "In Stock", variant: "green" },
  "low-stock": { label: "Low Stock", variant: "yellow" },
  "out-of-stock": { label: "Out of Stock", variant: "red" },
  "stock-in": { label: "Stock In", variant: "green" },
  "stock-out": { label: "Stock Out", variant: "orange" },
  draft: { label: "Draft", variant: "gray" },
  issued: { label: "Issued", variant: "blue" },
  "partially-received": { label: "Partially Received", variant: "yellow" },
  received: { label: "Received", variant: "green" },
  cancelled: { label: "Cancelled", variant: "red" },
  completed: { label: "Completed", variant: "green" },
  "awaiting-delivery": { label: "Awaiting Delivery", variant: "gray" },
  "at-gate": { label: "At the Gate", variant: "orange" },
  "awaiting-inspection": { label: "Awaiting Inspection", variant: "yellow" },
  "awaiting-putaway": { label: "Awaiting Putaway", variant: "blue" },
  "pending-inspection": { label: "Pending Inspection", variant: "yellow" },
  inspected: { label: "Inspected", variant: "blue" },
  "putaway-partial": { label: "Putaway Partial", variant: "orange" },
  "putaway-complete": { label: "Putaway Complete", variant: "green" },
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
