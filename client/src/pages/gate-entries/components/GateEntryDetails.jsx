import StatusBadge from "../../../components/common/StatusBadge";
import { formatDateTime } from "../../../utils/formatDate";

const Field = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
    <dd className="mt-1.5 break-words text-sm font-medium text-gray-900">{children || <span className="text-gray-400">—</span>}</dd>
  </div>
);

// Read-only view of a gate entry (the full entry), shown in a modal.
const GateEntryDetails = ({ entry }) => (
  <div className="space-y-6">
    <dl className="grid grid-cols-2 gap-x-8 gap-y-6 rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:grid-cols-3">
      <Field label="Gate Entry">{entry.gateEntryNumber}</Field>
      <Field label="Status">
        <StatusBadge status={entry.status} />
      </Field>
      <Field label="Arrived">{formatDateTime(entry.arrivalAt)}</Field>
      <Field label="Source">{entry.purchaseOrder ? `Purchase order ${entry.purchaseOrder.poNumber}` : "Direct from seller"}</Field>
      <Field label="Seller">{entry.seller?.name}</Field>
      <Field label="Supplier">{entry.supplier?.name}</Field>
      <Field label="Vehicle Number">{entry.vehicleNumber}</Field>
      <Field label="Packages">{entry.packages}</Field>
      <Field label="Challan / Invoice No.">{entry.challanNumber}</Field>
      <Field label="Driver Name">{entry.driverName}</Field>
      <Field label="Driver Phone">{entry.driverPhone}</Field>
      {entry.cancelledAt && <Field label="Cancelled">{formatDateTime(entry.cancelledAt)}</Field>}
    </dl>

    <Field label="Notes">{entry.notes && <p className="whitespace-pre-wrap">{entry.notes}</p>}</Field>
  </div>
);

export default GateEntryDetails;
