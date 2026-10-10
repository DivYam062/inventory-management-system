import { useCallback, useEffect, useState } from "react";
import { Link2, Plus, Truck, X } from "lucide-react";
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
import SupplierTable from "./components/SupplierTable";
import SupplierForm, { SUPPLIER_FORM_ID } from "./components/SupplierForm";
import AssignSellerForm, { ASSIGN_FORM_ID } from "./components/AssignSellerForm";
import { usePermissions } from "../../hooks/usePermissions";
import {
  getSuppliers,
  createSupplier,
  updateSupplier,
  assignSupplier,
  unassignSupplier,
  deleteSupplier,
} from "../../services/supplierService";
import { getSellers } from "../../services/sellerService";
import { getErrorMessage } from "../../utils/getErrorMessage";
import { createOptionsLoader } from "../../utils/dropdownLoaders";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const ASSIGNMENT_OPTIONS = [
  { value: "", label: "All Suppliers" },
  { value: "true", label: "Assigned" },
  { value: "false", label: "Unassigned" },
];

// Seller dropdowns load from the API only when opened, 40 at a time. The filter lists every seller; the
// create / assign forms only offer active sellers (a supplier cannot be put under an inactive one).
const loadAllSellers = createOptionsLoader(getSellers, (seller) => ({ value: seller.id, label: seller.name }));
const loadActiveSellers = (args) => loadAllSellers({ ...args, params: { status: "active" } });

const Suppliers = () => {
  const { can } = usePermissions();
  const canCreate = can("supplier", "create");
  const canEdit = can("supplier", "edit"); // also covers assign / unassign, delete and active/inactive
  const canListSellers = can("seller", "view"); // the seller filter needs it

  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [assigned, setAssigned] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // formTarget: null = closed, "new" = create form, otherwise the supplier being edited.
  const [formTarget, setFormTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [supplierToDelete, setSupplierToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Activate/deactivate from the table. Deactivating asks for confirmation first.
  const [togglingId, setTogglingId] = useState(null);
  const [statusTarget, setStatusTarget] = useState(null);
  const [statusError, setStatusError] = useState("");

  // Assign an unassigned supplier to a seller / unassign one from theirs.
  const [assignTarget, setAssignTarget] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [unassignTarget, setUnassignTarget] = useState(null);
  const [unassigning, setUnassigning] = useState(false);
  const [unassignError, setUnassignError] = useState("");

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

  const loadSuppliers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, meta } = await getSuppliers({
        search: search || undefined,
        status: status || undefined,
        sellerId: sellerId || undefined,
        assigned: assigned || undefined,
        page,
        limit: PAGE_SIZE,
      });

      if (data.length === 0 && meta && page > meta.total_page) {
        setPage(meta.total_page);
        return;
      }

      setSuppliers(data);
      setTotalPages(meta?.total_page ?? 1);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load suppliers."));
    } finally {
      setLoading(false);
    }
  }, [search, status, sellerId, assigned, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change; no data-fetching library is set up in this project yet
    loadSuppliers();
  }, [loadSuppliers]);

  const hasActiveFilters = Boolean(searchInput || status || sellerId || assigned);

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setSellerId("");
    setAssigned("");
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
        await createSupplier(values);
      } else {
        await updateSupplier(formTarget.id, values);
      }

      setFormTarget(null);
      loadSuppliers();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to save supplier."));
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (supplier, nextStatus) => {
    try {
      setTogglingId(supplier.id);
      setStatusError("");

      const { data } = await updateSupplier(supplier.id, { status: nextStatus });

      if (status) {
        // A status filter is active, so the row may no longer belong in the list.
        loadSuppliers();
      } else {
        setSuppliers((previous) => previous.map((s) => (s.id === data.id ? data : s)));
      }
    } catch (err) {
      setStatusError(getErrorMessage(err, "Failed to update supplier status."));
    } finally {
      setTogglingId(null);
      setStatusTarget(null);
    }
  };

  const handleToggleStatus = (supplier) => {
    if (supplier.status === "active") {
      setStatusTarget(supplier);
    } else {
      changeStatus(supplier, "active");
    }
  };

  const handleAssign = async (selectedSellerId) => {
    try {
      setAssigning(true);
      setAssignError("");

      await assignSupplier(assignTarget.id, selectedSellerId);

      setAssignTarget(null);
      loadSuppliers();
    } catch (err) {
      setAssignError(getErrorMessage(err, "Failed to assign the supplier."));
    } finally {
      setAssigning(false);
    }
  };

  const handleUnassignConfirm = async () => {
    if (!unassignTarget) return;

    try {
      setUnassigning(true);
      setUnassignError("");

      await unassignSupplier(unassignTarget.id);

      setUnassignTarget(null);
      loadSuppliers();
    } catch (err) {
      setUnassignError(getErrorMessage(err, "Failed to unassign the supplier."));
    } finally {
      setUnassigning(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!supplierToDelete) return;

    try {
      setDeleting(true);
      setDeleteError("");

      await deleteSupplier(supplierToDelete.id);
      setSupplierToDelete(null);

      if (suppliers.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        loadSuppliers();
      }
    } catch (err) {
      setDeleteError(getErrorMessage(err, "Failed to delete supplier."));
    } finally {
      setDeleting(false);
    }
  };

  const isEditing = formTarget && formTarget !== "new";

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="The people who work for your sellers. A supplier works under one seller at a time."
      />

      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="sm:w-72">
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search by name or email..." />
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

          <div className="sm:w-44">
            <Select
              aria-label="Filter by assignment"
              value={assigned}
              onChange={(e) => {
                setAssigned(e.target.value);
                setPage(1);
              }}
              options={ASSIGNMENT_OPTIONS}
            />
          </div>

          {canListSellers && (
            <div className="sm:w-52">
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
          <ErrorState message={error} onRetry={loadSuppliers} />
        ) : (
          <Card
            title="Suppliers"
            description={hasActiveFilters ? "Filtered results" : "All suppliers"}
            actions={
              canCreate && (
                <Button icon={Plus} onClick={() => openForm("new")}>
                  Create Supplier
                </Button>
              )
            }
          >
            {!loading && suppliers.length === 0 ? (
              <EmptyState
                icon={Truck}
                title={hasActiveFilters ? "No suppliers match your filters" : "No suppliers yet"}
                description={
                  hasActiveFilters
                    ? "Try a different search or change the filters above."
                    : canCreate
                      ? "Use the Create Supplier button above to add the first one."
                      : "Suppliers will appear here once they are added."
                }
              />
            ) : (
              <>
                {statusError && (
                  <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {statusError}
                  </div>
                )}

                <SupplierTable
                  suppliers={suppliers}
                  loading={loading}
                  canEdit={canEdit}
                  togglingId={togglingId}
                  onToggleStatus={handleToggleStatus}
                  onAssign={(supplier) => {
                    setAssignError("");
                    setAssignTarget(supplier);
                  }}
                  onUnassign={(supplier) => {
                    setUnassignError("");
                    setUnassignTarget(supplier);
                  }}
                  onEdit={(supplier) => openForm(supplier)}
                  onDelete={(supplier) => {
                    setDeleteError("");
                    setSupplierToDelete(supplier);
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
        headerProps={{ heading: isEditing ? "Edit Supplier" : "Create Supplier", icon: Truck }}
        footerProps={{
          secondaryButton: { text: "Cancel", onClick: closeForm, disabled: submitting },
          primaryButton: {
            text: isEditing ? "Save Changes" : "Create Supplier",
            type: "submit",
            form: SUPPLIER_FORM_ID,
            loading: submitting,
          },
        }}
      >
        {formTarget && (
          <SupplierForm
            key={isEditing ? formTarget.id : "new"}
            supplier={isEditing ? formTarget : null}
            loadSellerOptions={loadActiveSellers}
            onSubmit={handleSubmit}
            apiError={formError}
          />
        )}
      </Modal>

      <Modal
        isOpen={Boolean(assignTarget)}
        onClose={() => !assigning && setAssignTarget(null)}
        size="md"
        headerProps={{ heading: "Assign to Seller", icon: Link2 }}
        footerProps={{
          secondaryButton: { text: "Cancel", onClick: () => setAssignTarget(null), disabled: assigning },
          primaryButton: { text: "Assign", type: "submit", form: ASSIGN_FORM_ID, loading: assigning },
        }}
      >
        {assignTarget && (
          <AssignSellerForm
            key={assignTarget.id}
            supplier={assignTarget}
            loadSellerOptions={loadActiveSellers}
            onSubmit={handleAssign}
            apiError={assignError}
          />
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(unassignTarget)}
        onClose={() => {
          setUnassignTarget(null);
          setUnassignError("");
        }}
        onConfirm={handleUnassignConfirm}
        title="Unassign Supplier"
        message={`Unassign ${unassignTarget?.name} from "${unassignTarget?.seller?.name}"? They will no longer work under this seller and can be assigned to another one.`}
        confirmLabel="Unassign"
        variant="warning"
        loading={unassigning}
        error={unassignError}
      />

      <ConfirmDialog
        open={Boolean(statusTarget)}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => changeStatus(statusTarget, "inactive")}
        title="Deactivate Supplier"
        message={`Deactivate ${statusTarget?.name}? They are kept on record but will no longer be offered when choosing a supplier.`}
        confirmLabel="Deactivate"
        variant="warning"
        loading={Boolean(statusTarget) && togglingId === statusTarget.id}
      />

      <ConfirmDialog
        open={Boolean(supplierToDelete)}
        onClose={() => {
          setSupplierToDelete(null);
          setDeleteError("");
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Supplier"
        message={`Delete ${supplierToDelete?.name} (${supplierToDelete?.email})? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
        error={deleteError}
      />
    </div>
  );
};

export default Suppliers;
