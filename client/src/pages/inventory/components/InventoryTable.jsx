import { History, ImageIcon, Minus, Plus } from "lucide-react";
import Table from "../../../components/ui/Table";
import Badge from "../../../components/ui/Badge";
import StatusBadge from "../../../components/common/StatusBadge";
import { buildImageUrl } from "../../../utils/buildImageUrl";
import { formatDateTime } from "../../../utils/formatDate";

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

// canEdit: the current user's inventory:edit permission, which is what increases or decreases stock.
// History is open to everyone who can view inventory.
const InventoryTable = ({ rows, loading, canEdit, onHistory, onAdjust }) => {
  const columns = [
    {
      key: "product",
      header: "Product",
      render: (row) => (
        <div className="flex min-w-0 items-center gap-3">
          {row.product.image ? (
            <img
              src={buildImageUrl(row.product.image)}
              alt={row.product.name}
              className="h-10 w-10 shrink-0 rounded-lg border border-gray-200 object-cover"
            />
          ) : (
            <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300">
              <ImageIcon size={18} />
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{row.product.name}</p>
            <p className="truncate text-xs text-gray-500">
              {row.product.sku}
              {row.product.barcode ? ` · ${row.product.barcode}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (row) =>
        row.product.category ? <Badge variant="blue">{row.product.category.name}</Badge> : <span className="text-gray-400">—</span>,
    },
    {
      key: "seller",
      header: "Seller",
      render: (row) => <span className="text-gray-600">{row.product.seller?.name || "—"}</span>,
    },
    {
      key: "quantity",
      header: "Stock",
      className: "text-right",
      render: (row) => (
        <span className="whitespace-nowrap font-medium tabular-nums text-gray-900">
          {row.quantity} <span className="font-normal text-gray-500">{row.product.unit}</span>
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: "updatedAt",
      header: "Last Change",
      render: (row) => <span className="whitespace-nowrap text-gray-600">{formatDateTime(row.updatedAt)}</span>,
    },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {canEdit && (
            <>
              <ActionButton
                icon={Plus}
                label={`Increase stock of ${row.product.name}`}
                onClick={() => onAdjust(row, "increase")}
                hoverClasses="hover:bg-green-50 hover:text-green-600"
              />
              <ActionButton
                icon={Minus}
                label={`Decrease stock of ${row.product.name}`}
                onClick={() => onAdjust(row, "decrease")}
                hoverClasses="hover:bg-red-50 hover:text-red-600"
                isDisabled={row.quantity <= 0}
              />
            </>
          )}
          <ActionButton
            icon={History}
            label={`History of ${row.product.name}`}
            onClick={() => onHistory(row)}
            hoverClasses="hover:bg-gray-100 hover:text-gray-700"
          />
        </div>
      ),
    },
  ];

  return <Table columns={columns} data={rows} loading={loading} emptyMessage="No stock found" keyField="id" />;
};

export default InventoryTable;
