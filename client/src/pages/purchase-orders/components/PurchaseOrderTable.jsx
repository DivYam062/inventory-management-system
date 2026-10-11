import { Ban, Eye, Pencil, Printer, Send, Trash2 } from "lucide-react";
import Table from "../../../components/ui/Table";
import StatusBadge from "../../../components/common/StatusBadge";
import { formatCurrency } from "../../../utils/currency";
import { formatDate } from "../../../utils/formatDate";

const ActionButton = ({ icon: Icon, label, onClick, hoverClasses, isDisabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={isDisabled}
    title={label}
    aria-label={label}
    className={`rounded-lg p-1.5 text-gray-400 transition disabled:cursor-not-allowed disabled:opacity-40 ${hoverClasses}`}
  >
    <Icon size={16} />
  </button>
);

// canEdit: the current user's purchase-order:edit permission, which also covers issuing, cancelling and
// deleting. Edit, issue and delete only apply to a draft; cancel to a draft or issued order.
const PurchaseOrderTable = ({ orders, loading, canEdit, busyId, onView, onPrint, onEdit, onIssue, onCancel, onDelete }) => {
  const columns = [
    {
      key: "poNumber",
      header: "PO Number",
      render: (order) => <span className="font-medium text-gray-900">{order.poNumber}</span>,
    },
    {
      key: "seller",
      header: "Seller",
      render: (order) => (
        <div className="min-w-0">
          <p className="truncate text-gray-900">{order.seller?.name || "—"}</p>
          <p className="truncate text-xs text-gray-500">{order.supplier?.name || "—"}</p>
        </div>
      ),
    },
    {
      key: "orderDate",
      header: "Order Date",
      render: (order) => <span className="whitespace-nowrap text-gray-600">{formatDate(order.orderDate)}</span>,
    },
    {
      key: "expectedDate",
      header: "Expected",
      render: (order) => <span className="whitespace-nowrap text-gray-600">{formatDate(order.expectedDate)}</span>,
    },
    {
      key: "itemCount",
      header: "Items",
      className: "text-right",
      render: (order) => <span className="tabular-nums text-gray-700">{order.itemCount}</span>,
    },
    {
      key: "totalAmount",
      header: "Total",
      className: "text-right",
      render: (order) => (
        <span className="whitespace-nowrap tabular-nums text-gray-900">{formatCurrency(order.totalAmount, order.currency)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (order) => <StatusBadge status={order.status} />,
    },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (order) => {
        const isDraft = order.status === "draft";
        const canCancel = order.status === "draft" || order.status === "issued";
        const isBusy = busyId === order.id;

        return (
          <div className="flex items-center justify-end gap-1">
            <ActionButton
              icon={Eye}
              label={`View ${order.poNumber}`}
              onClick={() => onView(order)}
              hoverClasses="hover:bg-gray-100 hover:text-gray-700"
              isDisabled={isBusy}
            />

            <ActionButton
              icon={Printer}
              label={`Print ${order.poNumber}`}
              onClick={() => onPrint(order)}
              hoverClasses="hover:bg-gray-100 hover:text-gray-700"
              isDisabled={isBusy}
            />

            {canEdit && isDraft && (
              <>
                <ActionButton
                  icon={Pencil}
                  label={`Edit ${order.poNumber}`}
                  onClick={() => onEdit(order)}
                  hoverClasses="hover:bg-blue-50 hover:text-blue-600"
                  isDisabled={isBusy}
                />
                <ActionButton
                  icon={Send}
                  label={`Issue ${order.poNumber}`}
                  onClick={() => onIssue(order)}
                  hoverClasses="hover:bg-green-50 hover:text-green-600"
                  isDisabled={isBusy}
                />
              </>
            )}

            {canEdit && canCancel && (
              <ActionButton
                icon={Ban}
                label={`Cancel ${order.poNumber}`}
                onClick={() => onCancel(order)}
                hoverClasses="hover:bg-orange-50 hover:text-orange-600"
                isDisabled={isBusy}
              />
            )}

            {canEdit && isDraft && (
              <ActionButton
                icon={Trash2}
                label={`Delete ${order.poNumber}`}
                onClick={() => onDelete(order)}
                hoverClasses="hover:bg-red-50 hover:text-red-600"
                isDisabled={isBusy}
              />
            )}
          </div>
        );
      },
    },
  ];

  return <Table columns={columns} data={orders} loading={loading} emptyMessage="No purchase orders found" keyField="id" />;
};

export default PurchaseOrderTable;
