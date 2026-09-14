import { ImageIcon, Tag, Truck, Boxes, Layers, Calendar, History } from "lucide-react";
import StatusBadge from "../../../components/common/StatusBadge";
import { getStockStatus } from "../../../utils/stock";
import { formatCurrency } from "../../../utils/currency";
import { buildImageUrl } from "../../../utils/buildImageUrl";

const DetailItem = ({ icon: Icon, label, value }) => (
  <div className="flex items-start gap-3">
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
      <Icon size={16} />
    </div>
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-gray-900">{value || "—"}</dd>
    </div>
  </div>
);

const ProductDetails = ({ product, currency = "INR" }) => {
  const imageUrl = buildImageUrl(product.image);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div className="flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
          {imageUrl ? (
            <img src={imageUrl} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon size={32} className="text-gray-300" />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={product.status} />
          <StatusBadge status={getStockStatus(product)} />
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2">
        <DetailItem icon={Tag} label="Category" value={product.category?.name} />
        <DetailItem
          icon={Truck}
          label="Supplier"
          value={product.supplier?.companyName || product.supplier?.name}
        />
        <DetailItem icon={Layers} label="Price" value={formatCurrency(product.price, currency)} />
        <DetailItem
          icon={Boxes}
          label="Current Stock"
          value={`${product.quantity} (min. ${product.minimumStock})`}
        />
        <DetailItem
          icon={Calendar}
          label="Created"
          value={product.createdAt && new Date(product.createdAt).toLocaleDateString()}
        />
        <DetailItem
          icon={History}
          label="Last Updated"
          value={product.updatedAt && new Date(product.updatedAt).toLocaleDateString()}
        />
      </dl>

      {product.description && (
        <div className="border-t border-gray-100 pt-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Description
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-gray-700">{product.description}</p>
        </div>
      )}
    </div>
  );
};

export default ProductDetails;
