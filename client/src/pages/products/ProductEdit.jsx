import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import Card from "../../components/ui/Card";
import ProductForm from "./components/ProductForm";
import { getProductById, updateProduct } from "../../services/productService";
import { getCategories } from "../../services/categoryService";
import { getSuppliers } from "../../services/supplierService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const ProductEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const currency = useSelector((state) => state.settings.currency);

  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [productRes, categoriesRes, suppliersRes] = await Promise.all([
        getProductById(id),
        getCategories(),
        getSuppliers(),
      ]);

      setProduct(productRes.product);
      setCategories(categoriesRes.categories);
      setSuppliers(suppliersRes.suppliers);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load product."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount; no data-fetching library is set up in this project yet
    loadData();
  }, [loadData]);

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      setApiError("");

      await updateProduct(id, values);
      navigate(`/products/${id}`);
    } catch (err) {
      setApiError(getErrorMessage(err, "Failed to update product."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState fullHeight message="Loading product..." />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={loadData} />;
  }

  if (!product) {
    return null;
  }

  return (
    <div>
      <PageHeader title="Edit Product" description={`Update details for ${product.name}`} />

      <Card>
        <ProductForm
          initialValues={product}
          categories={categories}
          suppliers={suppliers}
          currency={currency}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/products/${id}`)}
          submitting={submitting}
          apiError={apiError}
          submitLabel="Save Changes"
        />
      </Card>
    </div>
  );
};

export default ProductEdit;
