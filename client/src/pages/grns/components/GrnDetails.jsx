import StatusBadge from "../../../components/common/StatusBadge";
import { formatDateTime } from "../../../utils/formatDate";
import DetailField from "../../../components/common/DetailField";

const Total = ({ label, value, tone = "text-gray-900" }) => (
  <div className="rounded-lg border border-gray-200 px-4 py-3">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
    <p className={`mt-1 text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
  </div>
);

const SOURCE_TEXT = {
  gate_entry: "Gate entry",
  purchase_order: "Purchase order",
  direct: "Directly from seller",
};

const inspectedStatuses = ["inspected", "putaway_partial", "putaway_complete"];

const GrnDetails = ({ grn }) => {
  const isInspected = inspectedStatuses.includes(grn.status);
  const hasOrder = grn.items.some((item) => item.orderedQty !== null && item.orderedQty !== undefined);
  const showPutaway = grn.status === "putaway_partial" || grn.status === "putaway_complete";

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-x-8 gap-y-6 rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:grid-cols-3">
        <DetailField label="GRN">{grn.grnNumber}</DetailField>
        <DetailField label="Status">
          <StatusBadge status={grn.status} />
        </DetailField>
        <DetailField label="Received">{formatDateTime(grn.receivedAt)}</DetailField>
        <DetailField label="Source">{SOURCE_TEXT[grn.source]}</DetailField>
        <DetailField label="Gate Entry">{grn.gateEntry?.gateEntryNumber}</DetailField>
        <DetailField label="Purchase Order">{grn.purchaseOrder?.poNumber}</DetailField>
        <DetailField label="Seller">{grn.seller?.name}</DetailField>
        <DetailField label="Supplier">{grn.supplier?.name}</DetailField>
        <DetailField label="Challan / Invoice No.">{grn.challanNumber}</DetailField>
        {grn.inspectedAt && <DetailField label="Inspected">{formatDateTime(grn.inspectedAt)}</DetailField>}
        {grn.cancelledAt && <DetailField label="Cancelled">{formatDateTime(grn.cancelledAt)}</DetailField>}
      </dl>

      <div className="grid grid-cols-3 gap-3">
        <Total label="Total received" value={grn.totals?.receivedQty ?? 0} />
        <Total label="Total passed" value={isInspected ? grn.totals.passedQty : "—"} tone="text-green-700" />
        <Total
          label="Total failed"
          value={isInspected ? grn.totals.failedQty : "—"}
          tone={isInspected && grn.totals.failedQty > 0 ? "text-red-600" : "text-gray-900"}
        />
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50">
            <tr className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="whitespace-nowrap px-4 py-3">Product</th>
              {hasOrder && <th className="whitespace-nowrap px-4 py-3 text-right">Ordered</th>}
              <th className="whitespace-nowrap px-4 py-3 text-right">Received</th>
              {isInspected && <th className="whitespace-nowrap px-4 py-3 text-right">Passed</th>}
              {isInspected && <th className="whitespace-nowrap px-4 py-3 text-right">Failed</th>}
              {showPutaway && <th className="whitespace-nowrap px-4 py-3 text-right">Put away</th>}
              <th className="whitespace-nowrap px-4 py-3">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {grn.items.map((item) => (
              <tr key={item.id}>
                <td className="min-w-40 px-4 py-3">
                  <p className="font-medium text-gray-900">{item.product?.name || "—"}</p>
                  <p className="text-xs text-gray-500">{item.product?.sku}</p>
                </td>
                {hasOrder && (
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {item.orderedQty ?? "—"} {item.orderedQty != null ? item.unit : ""}
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {item.receivedQty} {item.unit}
                </td>
                {isInspected && (
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-green-700">
                    {item.passedQty} {item.unit}
                  </td>
                )}
                {isInspected && (
                  <td className={`whitespace-nowrap px-4 py-3 text-right tabular-nums ${item.failedQty > 0 ? "text-red-600" : ""}`}>
                    {item.failedQty} {item.unit}
                  </td>
                )}
                {showPutaway && (
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {item.putawayQty} {item.unit}
                  </td>
                )}
                <td className="min-w-32 px-4 py-3 text-gray-600">{item.remarks || <span className="text-gray-400">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DetailField label="Notes">{grn.notes && <p className="whitespace-pre-wrap">{grn.notes}</p>}</DetailField>
    </div>
  );
};

export default GrnDetails;
