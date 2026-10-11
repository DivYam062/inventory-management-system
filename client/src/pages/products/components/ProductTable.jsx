import { Eye, ImageIcon, Pencil, Trash2 } from "lucide-react";
import Table from "../../../components/ui/Table";
import Toggle from "../../../components/ui/Toggle";
import Badge from "../../../components/ui/Badge";
import StatusBadge from "../../../components/common/StatusBadge";
import { buildImageUrl } from "../../../utils/buildImageUrl";
import { formatCurrency } from "../../../utils/currency";

export const ProductThumbnail = ({ product, size = "h-10 w-10" }) =>
  product.image ? (
    <img src={buildImageUrl(product.image)} alt={product.name} className={`${size} shrink-0 rounded-lg border border-gray-200 object-cover`} />
  ) : (
    <span aria-hidden="true" className={`${size} flex shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-300`}>
      <ImageIcon size={18} />
    </span>
  );

// canEdit: the current user's product:edit permission, which also covers deleting and switching a product
// active/inactive.
const ProductTable = ({ products, loading, canEdit, togglingId, onView, onToggleStatus, onEdit, onDelete }) => {
  const columns = [
    {
      key: "name",
      header: "Product",
      render: (product) => (
        <div className="flex min-w-0 items-center gap-3">
          <ProductThumbnail product={product} />
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{product.name}</p>
            <p className="truncate text-xs text-gray-500">
              {product.sku}
              {product.barcode ? ` · ${product.barcode}` : ""}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (product) =>
        product.category ? <Badge variant="blue">{product.category.name}</Badge> : <span className="text-gray-400">—</span>,
    },
    {
      key: "seller",
      header: "Seller",
      render: (product) => <span className="text-gray-600">{product.seller?.name || "—"}</span>,
    },
    {
      key: "unit",
      header: "Unit",
      render: (product) => <span className="text-gray-600">{product.unit || "—"}</span>,
    },
    {
      key: "price",
      header: "Price",
      className: "text-right",
      render: (product) => (
        <span className="tabular-nums text-gray-700">
          {product.price === undefined || product.price === null ? "—" : formatCurrency(product.price, product.currency)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (product) => <StatusBadge status={product.status} />,
    },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (product) => (
        <div className="flex items-center justify-end gap-1">
          {canEdit && (
            <Toggle
              size="sm"
              aria-label={`${product.status === "active" ? "Deactivate" : "Activate"} ${product.name}`}
              isChecked={product.status === "active"}
              isDisabled={togglingId === product.id}
              onChange={() => onToggleStatus(product)}
              className="mr-2"
            />
          )}

          <button
            type="button"
            onClick={() => onView(product)}
            title="View product"
            aria-label={`View ${product.name}`}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <Eye size={16} />
          </button>

          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => onEdit(product)}
                title="Edit product"
                aria-label={`Edit ${product.name}`}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
              >
                <Pencil size={16} />
              </button>

              <button
                type="button"
                onClick={() => onDelete(product)}
                title="Delete product"
                aria-label={`Delete ${product.name}`}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return <Table columns={columns} data={products} loading={loading} emptyMessage="No products found" keyField="id" />;
};

export default ProductTable;
