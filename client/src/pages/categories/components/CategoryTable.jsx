import { Pencil, Trash2 } from "lucide-react";
import Table from "../../../components/ui/Table";
import Toggle from "../../../components/ui/Toggle";
import StatusBadge from "../../../components/common/StatusBadge";

// canEdit: the current user's category:edit permission, which also covers deleting and switching a
// category active/inactive. A category that products still use cannot be deleted.
const CategoryTable = ({ categories, loading, canEdit, togglingId, onToggleStatus, onEdit, onDelete }) => {
  const columns = [
    {
      key: "name",
      header: "Category",
      render: (category) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{category.name}</p>
          {category.description && (
            <p className="max-w-md truncate text-xs text-gray-500" title={category.description}>
              {category.description}
            </p>
          )}
        </div>
      ),
    },
    {
      key: "productCount",
      header: "Products",
      className: "text-right",
      render: (category) => <span className="tabular-nums text-gray-700">{category.productCount}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (category) => <StatusBadge status={category.status} />,
    },
    ...(canEdit
      ? [
          {
            key: "actions",
            header: "Action",
            className: "text-right",
            render: (category) => {
              const inUse = category.productCount > 0;

              return (
                <div className="flex items-center justify-end gap-1">
                  <Toggle
                    size="sm"
                    aria-label={`${category.status === "active" ? "Deactivate" : "Activate"} ${category.name}`}
                    isChecked={category.status === "active"}
                    isDisabled={togglingId === category.id}
                    onChange={() => onToggleStatus(category)}
                    className="mr-2"
                  />

                  <button
                    type="button"
                    onClick={() => onEdit(category)}
                    title="Edit category"
                    aria-label={`Edit ${category.name}`}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => onDelete(category)}
                    disabled={inUse}
                    title={inUse ? `Used by ${category.productCount} product${category.productCount === 1 ? "" : "s"}` : "Delete category"}
                    aria-label={`Delete ${category.name}`}
                    className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-gray-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            },
          },
        ]
      : []),
  ];

  return <Table columns={columns} data={categories} loading={loading} emptyMessage="No categories found" keyField="id" />;
};

export default CategoryTable;
