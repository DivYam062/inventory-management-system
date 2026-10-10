import Badge from "../../../components/ui/Badge";
import StatusBadge from "../../../components/common/StatusBadge";
import { buildImageUrl } from "../../../utils/buildImageUrl";
import { formatCurrency } from "../../../utils/currency";
import { ProductThumbnail } from "./ProductTable";

const Field = ({ label, children }) => (
  <div>
    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900">{children || <span className="text-gray-400">—</span>}</dd>
  </div>
);

// Read-only view of a product, shown in a modal.
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

    <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label="Product Name">{product.name}</Field>
      <Field label="SKU">{product.sku}</Field>
      <Field label="Category">
        {product.category && (
          <span className="inline-flex items-center gap-2">
            <Badge variant="blue">{product.category.name}</Badge>
            {product.category.status === "inactive" && <span className="text-xs text-gray-500">(inactive)</span>}
          </span>
        )}
      </Field>
      <Field label="Seller">
        {product.seller && (
          <span>
            {product.seller.name}
            {product.seller.status === "inactive" && <span className="ml-2 text-xs text-gray-500">(inactive)</span>}
          </span>
        )}
      </Field>
      <Field label="Unit of Measurement">{product.unit}</Field>
      <Field label="Price">
        {product.price !== undefined && product.price !== null ? formatCurrency(product.price, product.currency) : null}
      </Field>
      <Field label="Status">
        <StatusBadge status={product.status} />
      </Field>
    </dl>

    <Field label="Description">
      {product.description && <p className="whitespace-pre-wrap">{product.description}</p>}
    </Field>
  </div>
);

export default ProductDetails;
