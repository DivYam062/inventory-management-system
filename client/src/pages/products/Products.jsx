import { useCallback, useEffect, useState } from "react";
import { Package, Plus, X } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import ConfirmDialog from "../../components/common/ConfirmDialog";
import Pagination from "../../components/common/Pagination";
import SearchBar from "../../components/common/SearchBar";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import ProductTable from "./components/ProductTable";
import ProductForm, { PRODUCT_FORM_ID } from "./components/ProductForm";
import ProductDetails from "./components/ProductDetails";
import { usePermissions } from "../../hooks/usePermissions";
import { getProducts, createProduct, updateProduct, deleteProduct } from "../../services/productService";
import { getCategories } from "../../services/categoryService";
import { getSellers } from "../../services/sellerService";
import { getCurrencies, getUnits } from "../../services/referenceService";
import { createOptionsLoader } from "../../utils/dropdownLoaders";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// Category / seller dropdowns load from the API only when opened, 40 at a time. The filters list every
// one; the create / edit form only offers active ones (a product cannot be put under an inactive one).
const loadAllCategories = createOptionsLoader(getCategories, (category) => ({ value: category.id, label: category.name }));
const loadAllSellers = createOptionsLoader(getSellers, (seller) => ({ value: seller.id, label: seller.name }));
const loadCurrencies = createOptionsLoader(getCurrencies, (currency) => ({
  value: currency.code,
  label: `${currency.code} - ${currency.name}`,
}));
const loadUnits = createOptionsLoader(getUnits, (unit) => ({ value: unit.code, label: `${unit.name} (${unit.code})` }));
const loadActiveCategories = (args) => loadAllCategories({ ...args, params: { status: "active" } });
const loadActiveSellers = (args) => loadAllSellers({ ...args, params: { status: "active" } });

const Products = () => {
  const { can } = usePermissions();
  const canCreate = can("product", "create");
  const canEdit = can("product", "edit"); // also covers deleting and switching active/inactive
  // The filter dropdowns read categories / sellers, so they need those view permissions.
  const canFilterCategory = can("category", "view");
  const canFilterSeller = can("seller", "view");

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // formTarget: null = closed, "new" = create form, otherwise the product being edited.
  const [formTarget, setFormTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [viewTarget, setViewTarget] = useState(null);

  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Activate/deactivate from the table. Deactivating asks for confirmation first.
  const [togglingId, setTogglingId] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusError, setStatusError] = useState("");

  // Debounce the raw search input before it drives the API call. Nothing happens unless the text really
  // changed, so opening the page (or paging) is never reset to page 1 by a stray timer.
  useEffect(() => {
    if (searchInput === search) return;

    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);

    return () => clearTimeout(handle);
  }, [searchInput, search]);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, meta } = await getProducts({
        search: search || undefined,
        status: status || undefined,
        categoryId: categoryId || undefined,
        sellerId: sellerId || undefined,
        page,
        limit: PAGE_SIZE,
      });

      if (data.length === 0 && meta && page > meta.total_page) {
        setPage(meta.total_page);
        return;
      }

      setProducts(data);
      setTotalPages(meta?.total_page ?? 1);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load products."));
    } finally {
      setLoading(false);
    }
  }, [search, status, categoryId, sellerId, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change; no data-fetching library is set up in this project yet
    loadProducts();
  }, [loadProducts]);

  const hasActiveFilters = Boolean(searchInput || status || categoryId || sellerId);

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setCategoryId("");
    setSellerId("");
    setPage(1);
  };

  const openForm = (target) => {
    setFormError("");
    setFormTarget(target);
  };

  const closeForm = () => {
    if (submitting) return;
    setFormTarget(null);
    setFormError("");
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      setFormError("");

      if (formTarget === "new") {
        await createProduct(values);
      } else {
        await updateProduct(formTarget.id, values);
      }

      setFormTarget(null);
      loadProducts();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to save product."));
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (product, nextStatus) => {
    try {
      setTogglingId(product.id);
      setStatusError("");

      const { data } = await updateProduct(product.id, { status: nextStatus });

      if (status) {
        // A status filter is active, so the row may no longer belong in the list.
        loadProducts();
      } else {
        setProducts((previous) => previous.map((p) => (p.id === data.id ? data : p)));
      }
    } catch (err) {
      setStatusError(getErrorMessage(err, "Failed to update product status."));
    } finally {
      setTogglingId(null);
      setStatusTarget(null);
    }
  };

  const handleToggleStatus = (product) => {
    if (product.status === "active") {
      setStatusTarget(product);
    } else {
      changeStatus(product, "active");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      setDeleting(true);
      setDeleteError("");

      await deleteProduct(productToDelete.id);
      setProductToDelete(null);

      if (products.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        loadProducts();
      }
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Failed to delete product."));
    } finally {
      setDeleting(false);
    }
  };

  const isEditing = formTarget && formTarget !== "new";

  return (
    <div>
      <PageHeader title="Products" description="The products you stock. Each is made under a seller and belongs to a category." />

      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="sm:w-72">
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search by name or SKU..." />
          </div>

          <div className="sm:w-40">
            <Select
              aria-label="Filter by status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              options={STATUS_OPTIONS}
            />
          </div>

          {canFilterCategory && (
            <div className="sm:w-48">
              <Select
                aria-label="Filter by category"
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setPage(1);
                }}
                isAsync
                loadOptions={loadAllCategories}
                isClearable
                placeholder="All Categories"
                noOptionsText="No categories found"
              />
            </div>
          )}

          {canFilterSeller && (
            <div className="sm:w-48">
              <Select
                aria-label="Filter by seller"
                value={sellerId}
                onChange={(e) => {
                  setSellerId(e.target.value);
                  setPage(1);
                }}
                isAsync
                loadOptions={loadAllSellers}
                isClearable
                placeholder="All Sellers"
                noOptionsText="No sellers found"
              />
            </div>
          )}

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" icon={X} onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={loadProducts} />
        ) : (
          <Card
            title="Products"
            description={hasActiveFilters ? "Filtered results" : "All products"}
            actions={
              canCreate && (
                <Button icon={Plus} onClick={() => openForm("new")}>
                  Create Product
                </Button>
              )
            }
          >
            {!loading && products.length === 0 ? (
              <EmptyState
                icon={Package}
                title={hasActiveFilters ? "No products match your filters" : "No products yet"}
                description={
                  hasActiveFilters
                    ? "Try a different search or change the filters above."
                    : canCreate
                      ? "Use the Create Product button above to add the first one."
                      : "Products will appear here once they are added."
                }
              />
            ) : (
              <>
                {statusError && (
                  <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {statusError}
                  </div>
                )}

                <ProductTable
                  products={products}
                  loading={loading}
                  canEdit={canEdit}
                  togglingId={togglingId}
                  onView={setViewTarget}
                  onToggleStatus={handleToggleStatus}
                  onEdit={(product) => openForm(product)}
                  onDelete={(product) => {
                    setDeleteError("");
                    setProductToDelete(product);
                  }}
                />

                {!loading && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
              </>
            )}
          </Card>
        )}
      </div>

      <Modal
        isOpen={Boolean(formTarget)}
        onClose={closeForm}
        size="xl"
        headerProps={{ heading: isEditing ? "Edit Product" : "Create Product", icon: Package }}
        footerProps={{
          secondaryButton: { text: "Cancel", onClick: closeForm, disabled: submitting },
          primaryButton: {
            text: isEditing ? "Save Changes" : "Create Product",
            type: "submit",
            form: PRODUCT_FORM_ID,
            loading: submitting,
          },
        }}
      >
        {formTarget && (
          <ProductForm
            key={isEditing ? formTarget.id : "new"}
            product={isEditing ? formTarget : null}
            loadCategoryOptions={loadActiveCategories}
            loadSellerOptions={loadActiveSellers}
            loadCurrencyOptions={loadCurrencies}
            loadUnitOptions={loadUnits}
            onSubmit={handleSubmit}
            apiError={formError}
          />
        )}
      </Modal>

      <Modal
        isOpen={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        size="xl"
        headerProps={{ heading: "Product Details", icon: Package }}
        footerProps={{ secondaryButton: { text: "Close", onClick: () => setViewTarget(null) } }}
      >
        {viewTarget && <ProductDetails product={viewTarget} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => changeStatus(statusTarget, "inactive")}
        title="Deactivate Product"
        message={`Deactivate "${statusTarget?.name}"? It is kept on record but will no longer be offered when choosing a product.`}
        confirmLabel="Deactivate"
        variant="warning"
        loading={Boolean(statusTarget) && togglingId === statusTarget.id}
      />

      <ConfirmDialog
        open={Boolean(productToDelete)}
        onClose={() => {
          setProductToDelete(null);
          setDeleteError("");
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Product"
        message={`Delete "${productToDelete?.name}"? Its image is removed too. This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
};

export default Products;
