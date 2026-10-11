import StatusBadge from "../../../components/common/StatusBadge";
import { formatDateTime } from "../../../utils/formatDate";
import DetailField from "../../../components/common/DetailField";

const GateEntryDetails = ({ entry }) => (
  <div className="space-y-6">
    <dl className="grid grid-cols-2 gap-x-8 gap-y-6 rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:grid-cols-3">
      <DetailField label="Gate Entry">{entry.gateEntryNumber}</DetailField>
      <DetailField label="Status">
        <StatusBadge status={entry.status} />
      </DetailField>
      <DetailField label="Arrived">{formatDateTime(entry.arrivalAt)}</DetailField>
      <DetailField label="Source">{entry.purchaseOrder ? `Purchase order ${entry.purchaseOrder.poNumber}` : "Direct from seller"}</DetailField>
      <DetailField label="Seller">{entry.seller?.name}</DetailField>
      <DetailField label="Supplier">{entry.supplier?.name}</DetailField>
      <DetailField label="Vehicle Number">{entry.vehicleNumber}</DetailField>
      <DetailField label="Packages">{entry.packages}</DetailField>
      <DetailField label="Challan / Invoice No.">{entry.challanNumber}</DetailField>
      <DetailField label="Driver Name">{entry.driverName}</DetailField>
      <DetailField label="Driver Phone">{entry.driverPhone}</DetailField>
      {entry.cancelledAt && <DetailField label="Cancelled">{formatDateTime(entry.cancelledAt)}</DetailField>}
    </dl>

    <DetailField label="Notes">{entry.notes && <p className="whitespace-pre-wrap">{entry.notes}</p>}</DetailField>
  </div>
);

export default GateEntryDetails;
