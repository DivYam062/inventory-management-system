import StatusBadge from "../../../components/common/StatusBadge";
import { formatDateTime } from "../../../utils/formatDate";

const Field = ({ label, children }) => (
  <div>
    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900">{children || <span className="text-gray-400">—</span>}</dd>
  </div>
);

// Read-only view of a putaway (the full putaway, with items), shown in a modal.
const PutawayDetails = ({ putaway }) => (
  <div className="space-y-6">
    <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <Field label="Putaway">{putaway.putawayNumber}</Field>
      <Field label="GRN">{putaway.grn?.grnNumber}</Field>
      <Field label="GRN Status">{putaway.grn && <StatusBadge status={putaway.grn.status} />}</Field>
      <Field label="Seller">{putaway.seller?.name}</Field>
      <Field label="Supplier">{putaway.supplier?.name}</Field>
      <Field label="Put Away">{formatDateTime(putaway.putawayAt)}</Field>
      <Field label="Put Away By">{putaway.performedBy?.name}</Field>
      <Field label="Total Quantity">{putaway.totalQty}</Field>
    </dl>

    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full min-w-full divide-y divide-gray-200 text-left text-sm">
        <thead className="bg-gray-50">
          <tr className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Barcode</th>
            <th className="px-4 py-3 text-right">Put away</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {putaway.items.map((item) => (
            <tr key={item.id}>
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{item.product?.name || "—"}</p>
                <p className="text-xs text-gray-500">{item.product?.sku}</p>
              </td>
              <td className="px-4 py-3 text-gray-600">{item.product?.barcode || <span className="text-gray-400">—</span>}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                {item.quantity} {item.unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <Field label="Notes">{putaway.notes && <p className="whitespace-pre-wrap">{putaway.notes}</p>}</Field>
  </div>
);

export default PutawayDetails;
