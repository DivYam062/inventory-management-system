import Badge from "../../../components/ui/Badge";
import StatusBadge from "../../../components/common/StatusBadge";
import { buildImageUrl } from "../../../utils/buildImageUrl";
import { formatCurrency } from "../../../utils/currency";
import { ProductThumbnail } from "./ProductTable";
import DetailField from "../../../components/common/DetailField";

const ProductDetails = ({ product }) => (
  <div className="space-y-5">
    {product.image ? (
      <img
        src={buildImageUrl(product.image)}
        alt={product.name}
        className="mx-auto max-h-64 rounded-xl border border-gray-200 object-contain"
      />
    ) : (
      <div className="flex justify-center">
        <ProductThumbnail product={product} size="h-24 w-24" />
      </div>
    )}

    <dl className="grid grid-cols-1 gap-x-8 gap-y-6 rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:grid-cols-2">
      <DetailField label="Product Name">{product.name}</DetailField>
      <DetailField label="SKU">{product.sku}</DetailField>
      <DetailField label="Barcode">{product.barcode}</DetailField>
      <DetailField label="Category">
        {product.category && (
          <span className="inline-flex items-center gap-2">
            <Badge variant="blue">{product.category.name}</Badge>
            {product.category.status === "inactive" && <span className="text-xs text-gray-500">(inactive)</span>}
          </span>
        )}
      </DetailField>
      <DetailField label="Seller">
        {product.seller && (
          <span>
            {product.seller.name}
            {product.seller.status === "inactive" && <span className="ml-2 text-xs text-gray-500">(inactive)</span>}
          </span>
        )}
      </DetailField>
      <DetailField label="Unit of Measurement">{product.unit}</DetailField>
      <DetailField label="Price">
        {product.price !== undefined && product.price !== null ? formatCurrency(product.price, product.currency) : null}
      </DetailField>
      <DetailField label="Status">
        <StatusBadge status={product.status} />
      </DetailField>
    </dl>

    <DetailField label="Description">
      {product.description && <p className="whitespace-pre-wrap">{product.description}</p>}
    </DetailField>
  </div>
);

export default ProductDetails;
