import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { ArrowLeft, Pencil } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import ProductDetails from "./components/ProductDetails";
import { getProductById } from "../../services/productService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const ProductView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const currency = useSelector((state) => state.settings.currency);
  const isAdmin = user?.role === "admin";

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProduct = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getProductById(id);
      setProduct(data.product);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load product."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount; no data-fetching library is set up in this project yet
    loadProduct();
  }, [loadProduct]);

  if (loading) {
    return <LoadingState fullHeight message="Loading product..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadProduct} />;
  }

  if (!product) {
    return null;
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate("/products")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition hover:text-gray-700"
      >
        <ArrowLeft size={16} />
        Back to Products
      </button>

      <PageHeader
        title={product.name}
        description={
          <>
            SKU: <span className="font-mono">{product.sku}</span>
          </>
        }
        actions={
          isAdmin && (
            <Button icon={Pencil} onClick={() => navigate(`/products/${id}/edit`)}>
              Edit Product
            </Button>
          )
        }
      />

      <Card>
        <ProductDetails product={product} currency={currency} />
      </Card>
    </div>
  );
};

export default ProductView;
