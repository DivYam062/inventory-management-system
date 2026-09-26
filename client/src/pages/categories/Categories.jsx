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
import CategoryFilters from "./components/CategoryFilters";
import CategoryTable from "./components/CategoryTable";
import { getCategories, deleteCategory } from "../../services/categoryService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PAGE_SIZE = 10;

const Categories = () => {
  const navigate = useNavigate();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, pages: 1 });

  const [categoryToDelete, setCategoryToDelete] = useState(null);
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
      setLoading(true);
      setError("");

      const data = await getCategories({
        search: search || undefined,
        status: status || undefined,
        page,
        limit: PAGE_SIZE,
      });

      setCategories(data.categories);
      setPagination({ total: data.total, pages: data.pages });
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load categories."));
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change; no data-fetching library is set up in this project yet
    loadCategories();
  }, [loadCategories]);

  const handleStatusChange = (value) => {
    setStatus(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setPage(1);
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      setDeleting(true);
      setDeleteError("");

      await deleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);

      if (categories.length === 1 && page > 1) {
        setPage((prev) => prev - 1);
      } else {
        loadCategories();
      }
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Failed to delete category."));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Organize your products into categories."
        actions={
          isAdmin && (
            <Button icon={Plus} onClick={() => navigate("/categories/create")}>
              Add Category
            </Button>
          )
        }
      />

      <Card bodyClassName="p-4">
        <CategoryFilters
          search={searchInput}
          onSearchChange={setSearchInput}
          status={status}
          onStatusChange={handleStatusChange}
          onClear={handleClearFilters}
        />
      </Card>

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={loadCategories} />
        ) : (
          <Card
            title={loading ? "Categories" : `${pagination.total} Categor${pagination.total === 1 ? "y" : "ies"}`}
            description={search || status ? "Filtered results" : "All categories in your catalog"}
          >
            <CategoryTable
              categories={categories}
              loading={loading}
              canManage={isAdmin}
              onEdit={(category) => navigate(`/categories/${category.id}/edit`)}
              onDelete={(category) => setCategoryToDelete(category)}
            />

            {!loading && categories.length > 0 && (
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
        open={!!categoryToDelete}
        onClose={() => {
          setCategoryToDelete(null);
          setDeleteError("");
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message={`Are you sure you want to delete "${categoryToDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
};

export default Categories;
