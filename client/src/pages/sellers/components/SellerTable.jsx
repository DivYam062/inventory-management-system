import { Pencil, Trash2 } from "lucide-react";
import Table from "../../../components/ui/Table";
import Toggle from "../../../components/ui/Toggle";
import StatusBadge from "../../../components/common/StatusBadge";

// canEdit: the current user's seller:edit permission, which also covers deleting and switching a seller
// active/inactive.
const SellerTable = ({ sellers, loading, canEdit, togglingId, onToggleStatus, onEdit, onDelete }) => {
  const columns = [
    {
      key: "name",
      header: "Seller",
      render: (seller) => (
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-sm font-semibold text-orange-600"
          >
            {seller.name?.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{seller.name}</p>
            <p className="truncate text-xs text-gray-500">{seller.email || "—"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (seller) => <span className="text-gray-600">{seller.phone || "—"}</span>,
    },
    {
      key: "address",
      header: "Address",
      render: (seller) => (
        <span className="block max-w-xs truncate text-gray-600" title={seller.address || undefined}>
          {seller.address || "—"}
        </span>
      ),
    },
    {
      key: "supplierCount",
      header: "Suppliers",
      className: "text-right",
      render: (seller) => <span className="tabular-nums text-gray-700">{seller.supplierCount ?? 0}</span>,
    },
    {
      key: "productCount",
      header: "Products",
      className: "text-right",
      render: (seller) => <span className="tabular-nums text-gray-700">{seller.productCount ?? 0}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (seller) => <StatusBadge status={seller.status} />,
    },
    ...(canEdit
      ? [
          {
            key: "actions",
            header: "Action",
            className: "text-right",
            render: (seller) => (
              <div className="flex items-center justify-end gap-1">
                <Toggle
                  size="sm"
                  aria-label={`${seller.status === "active" ? "Deactivate" : "Activate"} ${seller.name}`}
                  isChecked={seller.status === "active"}
                  isDisabled={togglingId === seller.id}
                  onChange={() => onToggleStatus(seller)}
                  className="mr-2"
                />

                <button
                  type="button"
                  onClick={() => onEdit(seller)}
                  title="Edit seller"
                  aria-label={`Edit ${seller.name}`}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                >
                  <Pencil size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(seller)}
                  disabled={seller.supplierCount > 0 || seller.productCount > 0}
                  title={
                    seller.supplierCount > 0
                      ? `${seller.supplierCount} supplier${seller.supplierCount === 1 ? "" : "s"} work under this seller`
                      : seller.productCount > 0
                        ? `${seller.productCount} product${seller.productCount === 1 ? " is" : "s are"} made under this seller`
                        : "Delete seller"
                  }
                  aria-label={`Delete ${seller.name}`}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return <Table columns={columns} data={sellers} loading={loading} emptyMessage="No sellers found" keyField="id" />;
};

export default SellerTable;
