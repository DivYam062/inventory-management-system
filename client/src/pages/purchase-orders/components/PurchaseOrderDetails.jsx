import StatusBadge from "../../../components/common/StatusBadge";
import { formatCurrency } from "../../../utils/currency";
import { formatDate } from "../../../utils/formatDate";

const Field = ({ label, children }) => (
  <div>
    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900">{children || <span className="text-gray-400">—</span>}</dd>
  </div>
);

// Read-only view of a purchase order (the full order, with items), shown in a modal.
const PurchaseOrderDetails = ({ order }) => {
  const showReceived = order.status !== "draft" && order.status !== "cancelled";

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="PO Number">{order.poNumber}</Field>
        <Field label="Status">
          <StatusBadge status={order.status} />
        </Field>
        <Field label="Currency">{order.currency}</Field>
        <Field label="Seller">{order.seller?.name}</Field>
        <Field label="Supplier">{order.supplier?.name}</Field>
        <Field label="Order Date">{formatDate(order.orderDate)}</Field>
        <Field label="Expected Date">{order.expectedDate ? formatDate(order.expectedDate) : null}</Field>
        <Field label="Over-receiving">{order.allowOverReceiving ? "Allowed" : "Not allowed"}</Field>
        {order.issuedAt && <Field label="Issued">{formatDate(order.issuedAt)}</Field>}
        {order.cancelledAt && <Field label="Cancelled">{formatDate(order.cancelledAt)}</Field>}
      </dl>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50">
            <tr className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              {showReceived && <th className="px-4 py-3 text-right">Received</th>}
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-900">{item.product?.name || "—"}</p>
                  <p className="text-xs text-gray-500">{item.product?.sku}</p>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {item.quantity} {item.unit}
                </td>
                {showReceived && (
                  <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                    {item.receivedQuantity} {item.unit}
                  </td>
                )}
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">
                  {formatCurrency(item.unitPrice, order.currency)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums font-medium">
                  {formatCurrency(item.lineTotal, order.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50">
              <td colSpan={showReceived ? 4 : 3} className="px-4 py-3 text-right text-sm font-medium text-gray-600">
                Total
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right text-base font-semibold tabular-nums text-gray-900">
                {formatCurrency(order.totalAmount, order.currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <Field label="Notes">{order.notes && <p className="whitespace-pre-wrap">{order.notes}</p>}</Field>
    </div>
  );
};

export default PurchaseOrderDetails;
