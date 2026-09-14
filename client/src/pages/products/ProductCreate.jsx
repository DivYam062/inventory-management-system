import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import PageHeader from "../../components/common/PageHeader";
import LoadingState from "../../components/common/LoadingState";
import ErrorState from "../../components/common/ErrorState";
import Card from "../../components/ui/Card";
import ProductForm from "./components/ProductForm";
import { createProduct } from "../../services/productService";
import { getCategories } from "../../services/categoryService";
import { getSuppliers } from "../../services/supplierService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const ProductCreate = () => {
  const navigate = useNavigate();
  const currency = useSelector((state) => state.settings.currency);

  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const loadOptions = useCallback(async () => {
    try {
      setLoadingOptions(true);
      setOptionsError("");

      const [categoriesRes, suppliersRes] = await Promise.all([
        getCategories(),
        getSuppliers(),
      ]);

      setCategories(categoriesRes.categories);
      setSuppliers(suppliersRes.suppliers);
    } catch (err) {
      setOptionsError(getErrorMessage(err, "Failed to load form data."));
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount; no data-fetching library is set up in this project yet
    loadOptions();
  }, [loadOptions]);

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      setApiError("");

      await createProduct(values);
      navigate("/products");
    } catch (err) {
      setApiError(getErrorMessage(err, "Failed to create product."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Add Product" description="Create a new product in your inventory." />

      <Card>
        {loadingOptions ? (
          <LoadingState message="Loading form..." />
        ) : optionsError ? (
          <ErrorState message={optionsError} onRetry={loadOptions} />
        ) : (
          <ProductForm
            categories={categories}
            suppliers={suppliers}
            currency={currency}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/products")}
            submitting={submitting}
            apiError={apiError}
            submitLabel="Create Product"
          />
        )}
      </Card>
    </div>
  );
};

export default ProductCreate;
