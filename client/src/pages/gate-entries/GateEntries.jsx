import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { DoorOpen, Plus, X } from "lucide-react";
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
import GateEntryTable from "./components/GateEntryTable";
import GateEntryForm, { GATE_ENTRY_FORM_ID } from "./components/GateEntryForm";
import GateEntryDetails from "./components/GateEntryDetails";
import { usePermissions } from "../../hooks/usePermissions";
import {
  getGateEntries,
  getGateEntryById,
  createGateEntry,
  updateGateEntry,
  cancelGateEntry,
} from "../../services/gateEntryService";
import { getSellers } from "../../services/sellerService";
import { getSuppliers } from "../../services/supplierService";
import { createOptionsLoader } from "../../utils/dropdownLoaders";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: "purchase_order", label: "Purchase Order" },
  { value: "direct", label: "Direct" },
];

// Dropdowns load from the API only when opened, 40 at a time. The seller filter lists every seller; the form
// only offers active sellers, and suppliers working under the chosen seller (see GateEntryForm).
const loadAllSellers = createOptionsLoader(getSellers, (seller) => ({ value: seller.id, label: seller.name }));
const loadActiveSellers = (args) => loadAllSellers({ ...args, params: { status: "active" } });
const loadSuppliers = createOptionsLoader(getSuppliers, (supplier) => ({ value: supplier.id, label: supplier.name }));

const ACTION_COPY = {
  cancel: {
    title: "Cancel Gate Entry",
    confirmLabel: "Cancel Entry",
    variant: "warning",
    message: (entry) => `Cancel ${entry?.gateEntryNumber}? It stays on record but can no longer be received against.`,
  },
};

const GateEntries = () => {
  const { can } = usePermissions();
  const canCreate = can("gate-entry", "create");
  const canEdit = can("gate-entry", "edit"); // also covers cancel (a gate entry is never deleted)
  const canFilterSeller = can("seller", "view");

  // An entry can be made against a purchase order only while that module is on and the user may see them.
  const isPurchaseOrderOn = useSelector((state) => state.auth.modules?.purchaseOrder);
  const canUsePurchaseOrder = Boolean(isPurchaseOrderOn) && can("purchase-order", "view");

  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Opening an entry for view / edit loads the full entry first.
  const [busyId, setBusyId] = useState(null);
  const [pageError, setPageError] = useState("");

  // formTarget: null = closed, "new" = create form, otherwise the full entry being edited.
  const [formTarget, setFormTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [viewTarget, setViewTarget] = useState(null);

  // action: { type: "cancel", entry } (confirms before cancelling)
  const [action, setAction] = useState(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");

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

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, meta } = await getGateEntries({
        search: search || undefined,
        status: status || undefined,
        source: source || undefined,
        sellerId: sellerId || undefined,
        page,
        limit: PAGE_SIZE,
      });

      if (data.length === 0 && meta && page > meta.total_page) {
        setPage(meta.total_page);
        return;
      }

      setEntries(data);
      setTotalPages(meta?.total_page ?? 1);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load gate entries."));
    } finally {
      setLoading(false);
    }
  }, [search, status, source, sellerId, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change; no data-fetching library is set up in this project yet
    loadEntries();
  }, [loadEntries]);

  const hasActiveFilters = Boolean(searchInput || status || source || sellerId);

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setSource("");
    setSellerId("");
    setPage(1);
  };

  const openFull = async (entry, onLoaded) => {
    try {
      setBusyId(entry.id);
      setPageError("");

      const { data } = await getGateEntryById(entry.id);
      onLoaded(data);
    } catch (err) {
      setPageError(getErrorMessage(err, "Failed to open the gate entry."));
    } finally {
      setBusyId(null);
    }
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
        await createGateEntry(values);
      } else {
        await updateGateEntry(formTarget.id, values);
      }

      setFormTarget(null);
      loadEntries();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to save gate entry."));
    } finally {
      setSubmitting(false);
    }
  };

  const closeAction = () => {
    if (acting) return;
    setAction(null);
    setActionError("");
  };

  const handleActionConfirm = async () => {
    if (!action) return;

    const { type, entry } = action;

    try {
      setActing(true);
      setActionError("");

      if (type === "cancel") await cancelGateEntry(entry.id);

      setAction(null);
      loadEntries();
    } catch (err) {
      setActionError(getErrorMessage(err, `Failed to ${type} the gate entry.`));
    } finally {
      setActing(false);
    }
  };

  const actionCopy = action ? ACTION_COPY[action.type] : null;
  const isEditing = formTarget && formTarget !== "new";

  return (
    <div>
      <PageHeader
        title="Gate Entry"
        description="Goods arriving at the gate, against an issued purchase order or directly from a seller. A GRN follows each entry."
      />

      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="sm:w-72">
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search number, vehicle or challan..." />
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

          <div className="sm:w-44">
            <Select
              aria-label="Filter by source"
              value={source}
              onChange={(e) => {
                setSource(e.target.value);
                setPage(1);
              }}
              options={SOURCE_OPTIONS}
            />
          </div>

          {canFilterSeller && (
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
          <ErrorState message={error} onRetry={loadEntries} />
        ) : (
          <Card
            title="Gate Entries"
            description={hasActiveFilters ? "Filtered results" : "All gate entries"}
            actions={
              canCreate && (
                <Button icon={Plus} onClick={() => openForm("new")}>
                  Create Gate Entry
                </Button>
              )
            }
          >
            {!loading && entries.length === 0 ? (
              <EmptyState
                icon={DoorOpen}
                title={hasActiveFilters ? "No gate entries match your filters" : "No gate entries yet"}
                description={
                  hasActiveFilters
                    ? "Try a different search or change the filters above."
                    : canCreate
                      ? "Use the Create Gate Entry button above to record the first arrival."
                      : "Gate entries will appear here once goods are recorded."
                }
              />
            ) : (
              <>
                {pageError && (
                  <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {pageError}
                  </div>
                )}

                <GateEntryTable
                  entries={entries}
                  loading={loading}
                  canEdit={canEdit}
                  busyId={busyId}
                  onView={(entry) => openFull(entry, setViewTarget)}
                  onEdit={(entry) => openFull(entry, openForm)}
                  onCancel={(entry) => {
                    setActionError("");
                    setAction({ type: "cancel", entry });
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
        headerProps={{
          heading: isEditing ? `Edit ${formTarget.gateEntryNumber}` : "Create Gate Entry",
          icon: DoorOpen,
        }}
        footerProps={{
          secondaryButton: { text: "Cancel", onClick: closeForm, disabled: submitting },
          primaryButton: {
            text: isEditing ? "Save Changes" : "Create Gate Entry",
            type: "submit",
            form: GATE_ENTRY_FORM_ID,
            loading: submitting,
          },
        }}
      >
        {formTarget && (
          <GateEntryForm
            key={isEditing ? formTarget.id : "new"}
            entry={isEditing ? formTarget : null}
            canUsePurchaseOrder={canUsePurchaseOrder}
            loadSellerOptions={loadActiveSellers}
            loadSupplierOptions={loadSuppliers}
            onSubmit={handleSubmit}
            apiError={formError}
          />
        )}
      </Modal>

      <Modal
        isOpen={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        size="xl"
        headerProps={{ heading: "Gate Entry", icon: DoorOpen }}
        footerProps={{ secondaryButton: { text: "Close", onClick: () => setViewTarget(null) } }}
      >
        {viewTarget && <GateEntryDetails entry={viewTarget} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(action)}
        onClose={closeAction}
        onConfirm={handleActionConfirm}
        title={actionCopy?.title}
        message={actionCopy?.message(action?.entry)}
        confirmLabel={actionCopy?.confirmLabel}
        variant={actionCopy?.variant}
        loading={acting}
        error={actionError}
      />
    </div>
  );
};

export default GateEntries;
