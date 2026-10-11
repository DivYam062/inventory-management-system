import StatusBadge from "../../../components/common/StatusBadge";
import { formatDateTime } from "../../../utils/formatDate";
import DetailField from "../../../components/common/DetailField";

const PutawayDetails = ({ putaway }) => (
  <div className="space-y-6">
    <dl className="grid grid-cols-2 gap-x-8 gap-y-6 rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:grid-cols-3">
      <DetailField label="Putaway">{putaway.putawayNumber}</DetailField>
      <DetailField label="GRN">{putaway.grn?.grnNumber}</DetailField>
      <DetailField label="GRN Status">{putaway.grn && <StatusBadge status={putaway.grn.status} />}</DetailField>
      <DetailField label="Seller">{putaway.seller?.name}</DetailField>
      <DetailField label="Supplier">{putaway.supplier?.name}</DetailField>
      <DetailField label="Put Away">{formatDateTime(putaway.putawayAt)}</DetailField>
      <DetailField label="Put Away By">{putaway.performedBy?.name}</DetailField>
      <DetailField label="Total Quantity">{putaway.totalQty}</DetailField>
    </dl>

    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full min-w-full divide-y divide-gray-200 text-left text-sm">
        <thead className="bg-gray-50">
          <tr className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            <th className="whitespace-nowrap px-4 py-3">Product</th>
            <th className="whitespace-nowrap px-4 py-3">Barcode</th>
            <th className="whitespace-nowrap px-4 py-3 text-right">Put away</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {putaway.items.map((item) => (
            <tr key={item.id}>
              <td className="min-w-40 px-4 py-3">
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

    <DetailField label="Notes">{putaway.notes && <p className="whitespace-pre-wrap">{putaway.notes}</p>}</DetailField>
  </div>
);

export default PutawayDetails;
