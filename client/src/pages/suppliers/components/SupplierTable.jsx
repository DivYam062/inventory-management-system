import { Link2, Pencil, Trash2, Unlink } from "lucide-react";
import Table from "../../../components/ui/Table";
import Badge from "../../../components/ui/Badge";
import Toggle from "../../../components/ui/Toggle";
import StatusBadge from "../../../components/common/StatusBadge";

// canEdit: the current user's supplier:edit permission, which also covers assigning / unassigning a
// supplier, deleting it and switching it active/inactive.
const SupplierTable = ({
  suppliers,
  loading,
  canEdit,
  togglingId,
  onToggleStatus,
  onAssign,
  onUnassign,
  onEdit,
  onDelete,
}) => {
  const columns = [
    {
      key: "name",
      header: "Supplier",
      render: (supplier) => (
        <div className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden="true"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-50 text-sm font-semibold text-purple-600"
          >
            {supplier.name?.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{supplier.name}</p>
            <p className="truncate text-xs text-gray-500">{supplier.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "seller",
      header: "Seller",
      render: (supplier) =>
        supplier.seller ? (
          <Badge variant="blue">{supplier.seller.name}</Badge>
        ) : (
          <span className="text-sm text-gray-400">Unassigned</span>
        ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (supplier) => <span className="text-gray-600">{supplier.phone || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (supplier) => <StatusBadge status={supplier.status} />,
    },
    ...(canEdit
      ? [
          {
            key: "actions",
            header: "Action",
            className: "text-right",
            render: (supplier) => (
              <div className="flex items-center justify-end gap-1">
                <Toggle
                  size="sm"
                  aria-label={`${supplier.status === "active" ? "Deactivate" : "Activate"} ${supplier.name}`}
                  isChecked={supplier.status === "active"}
                  isDisabled={togglingId === supplier.id}
                  onChange={() => onToggleStatus(supplier)}
                  className="mr-2"
                />

                {supplier.seller ? (
                  <button
                    type="button"
                    onClick={() => onUnassign(supplier)}
                    title={`Unassign from ${supplier.seller.name}`}
                    aria-label={`Unassign ${supplier.name}`}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-yellow-50 hover:text-yellow-700"
                  >
                    <Unlink size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAssign(supplier)}
                    title="Assign to a seller"
                    aria-label={`Assign ${supplier.name}`}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-green-50 hover:text-green-600"
                  >
                    <Link2 size={16} />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onEdit(supplier)}
                  title="Edit supplier"
                  aria-label={`Edit ${supplier.name}`}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                >
                  <Pencil size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(supplier)}
                  title="Delete supplier"
                  aria-label={`Delete ${supplier.name}`}
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return <Table columns={columns} data={suppliers} loading={loading} emptyMessage="No suppliers found" keyField="id" />;
};

export default SupplierTable;
