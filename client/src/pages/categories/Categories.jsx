import { useCallback, useEffect, useState } from "react";
import { Plus, Tags, X } from "lucide-react";
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
import CategoryTable from "./components/CategoryTable";
import CategoryForm, { CATEGORY_FORM_ID } from "./components/CategoryForm";
import { usePermissions } from "../../hooks/usePermissions";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../services/categoryService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const Categories = () => {
  const { can } = usePermissions();
  const canCreate = can("category", "create");
  const canEdit = can("category", "edit"); // also covers deleting and switching active/inactive

  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // formTarget: null = closed, "new" = create form, otherwise the category being edited.
  const [formTarget, setFormTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [togglingId, setTogglingId] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    if (searchInput === search) return;

    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);

    return () => clearTimeout(handle);
  }, [searchInput, search]);

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, meta } = await getCategories({
        search: search || undefined,
        status: status || undefined,
        page,
        limit: PAGE_SIZE,
      });

      if (data.length === 0 && meta && page > meta.total_page) {
        setPage(meta.total_page);
        return;
      }

      setCategories(data);
      setTotalPages(meta?.total_page ?? 1);
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

  const hasActiveFilters = Boolean(searchInput || status);

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
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
        await createCategory(values);
      } else {
        await updateCategory(formTarget.id, values);
      }

      setFormTarget(null);
      loadCategories();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to save category."));
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (category, nextStatus) => {
    try {
      setTogglingId(category.id);
      setStatusError("");

      const { data } = await updateCategory(category.id, { status: nextStatus });

      if (status) {
        // A status filter is active, so the row may no longer belong in the list.
        loadCategories();
      } else {
        setCategories((previous) => previous.map((c) => (c.id === data.id ? data : c)));
      }
    } catch (err) {
      setStatusError(getErrorMessage(err, "Failed to update category status."));
    } finally {
      setTogglingId(null);
      setStatusTarget(null);
    }
  };

  const handleToggleStatus = (category) => {
    if (category.status === "active") {
      setStatusTarget(category);
    } else {
      changeStatus(category, "active");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;

    try {
      setDeleting(true);
      setDeleteError("");

      await deleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);

      if (categories.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        loadCategories();
      }
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Failed to delete category."));
    } finally {
      setDeleting(false);
    }
  };

  const isEditing = formTarget && formTarget !== "new";

  return (
    <div>
      <PageHeader title="Categories" description="Organize your products into categories." />

      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="sm:w-72">
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search by name..." />
          </div>

          <div className="sm:w-44">
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

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" icon={X} onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={loadCategories} />
        ) : (
          <Card
            title="Categories"
            description={hasActiveFilters ? "Filtered results" : "All categories in your catalog"}
            actions={
              canCreate && (
                <Button icon={Plus} onClick={() => openForm("new")}>
                  Create Category
                </Button>
              )
            }
          >
            {!loading && categories.length === 0 ? (
              <EmptyState
                icon={Tags}
                title={hasActiveFilters ? "No categories match your filters" : "No categories yet"}
                description={
                  hasActiveFilters
                    ? "Try a different search or change the filters above."
                    : canCreate
                      ? "Use the Create Category button above to add the first one."
                      : "Categories will appear here once they are added."
                }
              />
            ) : (
              <>
                {statusError && (
                  <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {statusError}
                  </div>
                )}

                <CategoryTable
                  categories={categories}
                  loading={loading}
                  canEdit={canEdit}
                  togglingId={togglingId}
                  onToggleStatus={handleToggleStatus}
                  onEdit={(category) => openForm(category)}
                  onDelete={(category) => {
                    setDeleteError("");
                    setCategoryToDelete(category);
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
        size="lg"
        headerProps={{ heading: isEditing ? "Edit Category" : "Create Category", icon: Tags }}
        footerProps={{
          secondaryButton: { text: "Cancel", onClick: closeForm, disabled: submitting },
          primaryButton: {
            text: isEditing ? "Save Changes" : "Create Category",
            type: "submit",
            form: CATEGORY_FORM_ID,
            loading: submitting,
          },
        }}
      >
        {formTarget && (
          <CategoryForm
            key={isEditing ? formTarget.id : "new"}
            category={isEditing ? formTarget : null}
            onSubmit={handleSubmit}
            apiError={formError}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => changeStatus(statusTarget, "inactive")}
        title="Deactivate Category"
        message={`Deactivate "${statusTarget?.name}"? It is kept, but will be hidden when choosing a category.`}
        confirmLabel="Deactivate"
        variant="warning"
        loading={Boolean(statusTarget) && togglingId === statusTarget.id}
      />

      <ConfirmDialog
        open={Boolean(categoryToDelete)}
        onClose={() => {
          setCategoryToDelete(null);
          setDeleteError("");
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message={`Delete "${categoryToDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
};

export default Categories;
