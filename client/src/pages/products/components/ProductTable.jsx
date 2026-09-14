import { Eye, Pencil, Trash2 } from "lucide-react";
import Table from "../../../components/ui/Table";
import Badge from "../../../components/ui/Badge";
import StatusBadge from "../../../components/common/StatusBadge";
import { getStockStatus } from "../../../utils/stock";
import { formatCurrency } from "../../../utils/currency";
import { buildImageUrl } from "../../../utils/buildImageUrl";

const ProductThumbnail = ({ product }) => {
  const imageUrl = buildImageUrl(product.image);

  if (imageUrl) {
    return (
      <img
        src={imageUrl}
        alt={product.name}
        className="h-9 w-9 shrink-0 rounded-lg border border-gray-200 object-cover"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-semibold text-blue-600">
      {product.name?.charAt(0).toUpperCase()}
    </div>
  );
};

const ProductTable = ({ products, loading, canManage, currency, onView, onEdit, onDelete }) => {
  const columns = [
    {
      key: "name",
      header: "Product",
      render: (product) => (
        <div className="flex items-center gap-3">
          <ProductThumbnail product={product} />
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{product.name}</p>
            <p className="font-mono text-xs text-gray-500">{product.sku}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      header: "Category",
      render: (product) =>
        product.category?.name ? (
          <Badge variant="gray">{product.category.name}</Badge>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "price",
      header: "Price",
      className: "text-right",
      render: (product) => (
        <span className="font-medium tabular-nums text-gray-900">
          {formatCurrency(product.price, currency)}
        </span>
      ),
    },
    {
      key: "stock",
      header: "Stock",
      className: "text-right",
      render: (product) => (
        <div className="flex items-center justify-end gap-2">
          <span className="font-medium tabular-nums text-gray-900">{product.quantity}</span>
          <StatusBadge status={getStockStatus(product)} />
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (product) => <StatusBadge status={product.status} />,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (product) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onView(product)}
            title="View product"
            aria-label="View product"
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <Eye size={16} />
          </button>

          {canManage && (
            <>
              <button
                type="button"
                onClick={() => onEdit(product)}
                title="Edit product"
                aria-label="Edit product"
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
              >
                <Pencil size={16} />
              </button>

              <button
                type="button"
                onClick={() => onDelete(product)}
                title="Delete product"
                aria-label="Delete product"
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

  return (
    <Table
      columns={columns}
      data={products}
      loading={loading}
      emptyMessage="No products found"
      keyField="id"
    />
  );
};

export default ProductTable;
