import { useCallback, useEffect, useState } from "react";
import { Plus, Store, X } from "lucide-react";
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
import SellerTable from "./components/SellerTable";
import SellerForm, { SELLER_FORM_ID } from "./components/SellerForm";
import { usePermissions } from "../../hooks/usePermissions";
import { getSellers, createSeller, updateSeller, deleteSeller } from "../../services/sellerService";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const Sellers = () => {
  const { can } = usePermissions();
  const canCreate = can("seller", "create");
  const canEdit = can("seller", "edit"); // also covers deleting and switching active/inactive

  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // formTarget: null = closed, "new" = create form, otherwise the seller being edited.
  const [formTarget, setFormTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [sellerToDelete, setSellerToDelete] = useState(null);
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

  const loadSellers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, meta } = await getSellers({
        search: search || undefined,
        status: status || undefined,
        page,
        limit: PAGE_SIZE,
      });

      if (data.length === 0 && meta && page > meta.total_page) {
        setPage(meta.total_page);
        return;
      }

      setSellers(data);
      setTotalPages(meta?.total_page ?? 1);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load sellers."));
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change; no data-fetching library is set up in this project yet
    loadSellers();
  }, [loadSellers]);

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
        await createSeller(values);
      } else {
        await updateSeller(formTarget.id, values);
      }

      setFormTarget(null);
      loadSellers();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to save seller."));
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (seller, nextStatus) => {
    try {
      setTogglingId(seller.id);
      setStatusError("");

      const { data } = await updateSeller(seller.id, { status: nextStatus });

      if (status) {
        // A status filter is active, so the row may no longer belong in the list.
        loadSellers();
      } else {
        setSellers((previous) => previous.map((s) => (s.id === data.id ? data : s)));
      }
    } catch (err) {
      setStatusError(getErrorMessage(err, "Failed to update seller status."));
    } finally {
      setTogglingId(null);
      setStatusTarget(null);
    }
  };

  const handleToggleStatus = (seller) => {
    if (seller.status === "active") {
      setStatusTarget(seller);
    } else {
      changeStatus(seller, "active");
    }
  };

  const handleDeleteConfirm = async () => {
    if (!sellerToDelete) return;

    try {
      setDeleting(true);
      setDeleteError("");

      await deleteSeller(sellerToDelete.id);
      setSellerToDelete(null);

      if (sellers.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        loadSellers();
      }
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Failed to delete seller."));
    } finally {
      setDeleting(false);
    }
  };

  const isEditing = formTarget && formTarget !== "new";

  return (
    <div>
      <PageHeader title="Sellers" description="The external sellers you buy from. Products and purchase orders are made against a seller." />

      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="sm:w-72">
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search by name or email..." />
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
          <ErrorState message={error} onRetry={loadSellers} />
        ) : (
          <Card
            title="Sellers"
            description={hasActiveFilters ? "Filtered results" : "All sellers"}
            actions={
              canCreate && (
                <Button icon={Plus} onClick={() => openForm("new")}>
                  Create Seller
                </Button>
              )
            }
          >
            {!loading && sellers.length === 0 ? (
              <EmptyState
                icon={Store}
                title={hasActiveFilters ? "No sellers match your filters" : "No sellers yet"}
                description={
                  hasActiveFilters
                    ? "Try a different search or change the filters above."
                    : canCreate
                      ? "Use the Create Seller button above to add the first one."
                      : "Sellers will appear here once they are added."
                }
              />
            ) : (
              <>
                {statusError && (
                  <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {statusError}
                  </div>
                )}

                <SellerTable
                  sellers={sellers}
                  loading={loading}
                  canEdit={canEdit}
                  togglingId={togglingId}
                  onToggleStatus={handleToggleStatus}
                  onEdit={(seller) => openForm(seller)}
                  onDelete={(seller) => {
                    setDeleteError("");
                    setSellerToDelete(seller);
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
        headerProps={{ heading: isEditing ? "Edit Seller" : "Create Seller", icon: Store }}
        footerProps={{
          secondaryButton: { text: "Cancel", onClick: closeForm, disabled: submitting },
          primaryButton: {
            text: isEditing ? "Save Changes" : "Create Seller",
            type: "submit",
            form: SELLER_FORM_ID,
            loading: submitting,
          },
        }}
      >
        {formTarget && (
          <SellerForm
            key={isEditing ? formTarget.id : "new"}
            seller={isEditing ? formTarget : null}
            onSubmit={handleSubmit}
            apiError={formError}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => changeStatus(statusTarget, "inactive")}
        title="Deactivate Seller"
        message={`Deactivate "${statusTarget?.name}"? It is kept on record but will no longer be offered when choosing a seller.`}
        confirmLabel="Deactivate"
        variant="warning"
        loading={Boolean(statusTarget) && togglingId === statusTarget.id}
      />

      <ConfirmDialog
        open={Boolean(sellerToDelete)}
        onClose={() => {
          setSellerToDelete(null);
          setDeleteError("");
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Seller"
        message={`Delete "${sellerToDelete?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
};

export default Sellers;
