import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Plus } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ErrorState from "../../components/common/ErrorState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Pagination from "../../components/common/Pagination";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import ProductFilters from "./components/ProductFilters";
import ProductTable from "./components/ProductTable";
import { getProducts, deleteProduct } from "../../services/productService";
import { getCategories } from "../../services/categoryService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PAGE_SIZE = 10;

const Products = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const currency = useSelector((state) => state.settings.currency);
  const isAdmin = user?.role === "admin";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stockStatus, setStockStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Debounce the raw search input before it drives the API call.
  useEffect(() => {
    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);

    return () => clearTimeout(handle);
  }, [searchInput]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await getCategories();
      setCategories(data.categories);
    } catch {
      // Non-fatal: the category filter just has no options; the product list still works.
    }
  }, []);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getProducts({
        search: search || undefined,
        category: category || undefined,
        stockStatus: stockStatus || undefined,
        page,
        limit: PAGE_SIZE,
      });

      setProducts(data.products);
      setPagination({ total: data.total, pages: data.pages });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load products."));
    } finally {
      setLoading(false);
    }
  }, [search, category, stockStatus, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-mount; no data-fetching library is set up in this project yet
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change; no data-fetching library is set up in this project yet
    loadProducts();
  }, [loadProducts]);

  const handleCategoryChange = (value) => {
    setCategory(value);
    setPage(1);
  };

  const handleStockStatusChange = (value) => {
    setStockStatus(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setCategory("");
    setStockStatus("");
    setPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      setDeleting(true);
      setDeleteError("");

      await deleteProduct(productToDelete.id);
      setProductToDelete(null);

      if (products.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        loadProducts();
      }
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Failed to delete product."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Products"
        description="Manage your product catalog and stock levels."
        actions={
          isAdmin && (
            <Button icon={Plus} onClick={() => navigate("/products/create")}>
              Add Product
            </Button>
          )
        }
      />

      <Card bodyClassName="p-4">
        <ProductFilters
          search={searchInput}
          onSearchChange={setSearchInput}
          category={category}
          onCategoryChange={handleCategoryChange}
          stockStatus={stockStatus}
          onStockStatusChange={handleStockStatusChange}
          categories={categories}
          onClear={handleClearFilters}
        />
      </Card>

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={loadProducts} />
        ) : (
          <Card
            title={loading ? "Products" : `${pagination.total} Product${pagination.total === 1 ? "" : "s"}`}
            description={
              search || category || stockStatus
                ? "Filtered results"
                : "All products in your catalog"
            }
          >
            <ProductTable
              products={products}
              loading={loading}
              canManage={isAdmin}
              currency={currency}
              onView={(product) => navigate(`/products/${product.id}`)}
              onEdit={(product) => navigate(`/products/${product.id}/edit`)}
              onDelete={(product) => setProductToDelete(product)}
            />

            {!loading && products.length > 0 && (
              <Pagination
                currentPage={page}
                totalPages={pagination.pages}
                onPageChange={setPage}
              />
            )}
          </Card>
        )}
      </div>

      <ConfirmDialog
        open={!!productToDelete}
        onClose={() => {
          setProductToDelete(null);
          setDeleteError("");
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message={`Are you sure you want to delete "${productToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
};

export default Products;
