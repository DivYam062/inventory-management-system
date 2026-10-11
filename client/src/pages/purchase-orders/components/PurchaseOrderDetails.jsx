import StatusBadge from "../../../components/common/StatusBadge";
import { formatCurrency } from "../../../utils/currency";
import { formatDate } from "../../../utils/formatDate";
import DetailField from "../../../components/common/DetailField";

const PurchaseOrderDetails = ({ order }) => {
  const showReceived = order.status !== "draft" && order.status !== "cancelled";

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-x-8 gap-y-6 rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:grid-cols-3">
        <DetailField label="PO Number">{order.poNumber}</DetailField>
        <DetailField label="Status">
          <StatusBadge status={order.status} />
        </DetailField>
        <DetailField label="Currency">{order.currency}</DetailField>
        <DetailField label="Seller">{order.seller?.name}</DetailField>
        <DetailField label="Supplier">{order.supplier?.name}</DetailField>
        <DetailField label="Order Date">{formatDate(order.orderDate)}</DetailField>
        <DetailField label="Expected Date">{order.expectedDate ? formatDate(order.expectedDate) : null}</DetailField>
        <DetailField label="Over-receiving">{order.allowOverReceiving ? "Allowed" : "Not allowed"}</DetailField>
        {order.issuedAt && <DetailField label="Issued">{formatDate(order.issuedAt)}</DetailField>}
        {order.cancelledAt && <DetailField label="Cancelled">{formatDate(order.cancelledAt)}</DetailField>}
      </dl>

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full min-w-full divide-y divide-gray-200 text-left text-sm">
          <thead className="bg-gray-50">
            <tr className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              <th className="whitespace-nowrap px-4 py-3">Product</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">Quantity</th>
              {showReceived && <th className="whitespace-nowrap px-4 py-3 text-right">Received</th>}
              <th className="whitespace-nowrap px-4 py-3 text-right">Price</th>
              <th className="whitespace-nowrap px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <tr key={item.id}>
                <td className="min-w-40 px-4 py-3">
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

      <DetailField label="Notes">{order.notes && <p className="whitespace-pre-wrap">{order.notes}</p>}</DetailField>
    </div>
  );
};

export default PurchaseOrderDetails;
