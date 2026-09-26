import { Pencil, Trash2 } from "lucide-react";
import Table from "../../../components/ui/Table";
import StatusBadge from "../../../components/common/StatusBadge";

const CategoryTable = ({ categories, loading, canManage, onEdit, onDelete }) => {
  const columns = [
    {
      key: "name",
      header: "Category",
      render: (category) => (
        <span className="font-medium text-gray-900">{category.name}</span>
      ),
    },
    {
      key: "description",
      header: "Description",
      render: (category) => (
        <span className="text-gray-600">{category.description || "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (category) => <StatusBadge status={category.status} />,
    },
    ...(canManage
      ? [
          {
            key: "actions",
            header: "",
            className: "text-right",
            render: (category) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(category)}
                  title="Edit category"
                  aria-label="Edit category"
                  className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                >
                  <Pencil size={16} />
                </button>

                <button
                  type="button"
                  onClick={() => onDelete(category)}
                  title="Delete category"
                  aria-label="Delete category"
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

  return (
    <Table
      columns={columns}
      data={categories}
      loading={loading}
      emptyMessage="No categories found"
      keyField="id"
    />
  );
};

export default CategoryTable;
