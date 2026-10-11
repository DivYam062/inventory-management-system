import StatusBadge from "../../../components/common/StatusBadge";
import { formatDateTime } from "../../../utils/formatDate";

const Field = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
    <dd className="mt-1.5 break-words text-sm font-medium text-gray-900">{children || <span className="text-gray-400">—</span>}</dd>
  </div>
);

// A figure with its caption (total received / passed / failed).
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

// Read-only view of a GRN (the full GRN, with items), shown in a modal.
const GrnDetails = ({ grn }) => {
  const isInspected = inspectedStatuses.includes(grn.status);
  const hasOrder = grn.items.some((item) => item.orderedQty !== null && item.orderedQty !== undefined);
  const showPutaway = grn.status === "putaway_partial" || grn.status === "putaway_complete";

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-x-8 gap-y-6 rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:grid-cols-3">
        <Field label="GRN">{grn.grnNumber}</Field>
        <Field label="Status">
          <StatusBadge status={grn.status} />
        </Field>
        <Field label="Received">{formatDateTime(grn.receivedAt)}</Field>
        <Field label="Source">{SOURCE_TEXT[grn.source]}</Field>
        <Field label="Gate Entry">{grn.gateEntry?.gateEntryNumber}</Field>
        <Field label="Purchase Order">{grn.purchaseOrder?.poNumber}</Field>
        <Field label="Seller">{grn.seller?.name}</Field>
        <Field label="Supplier">{grn.supplier?.name}</Field>
        <Field label="Challan / Invoice No.">{grn.challanNumber}</Field>
        {grn.inspectedAt && <Field label="Inspected">{formatDateTime(grn.inspectedAt)}</Field>}
        {grn.cancelledAt && <Field label="Cancelled">{formatDateTime(grn.cancelledAt)}</Field>}
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

      <Field label="Notes">{grn.notes && <p className="whitespace-pre-wrap">{grn.notes}</p>}</Field>
    </div>
  );
};

export default GrnDetails;
