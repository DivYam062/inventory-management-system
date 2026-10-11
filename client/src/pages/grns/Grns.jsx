import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { PackageCheck, Plus, X } from "lucide-react";
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
import GrnTable from "./components/GrnTable";
import GrnForm, { GRN_FORM_ID } from "./components/GrnForm";
import GrnInspectForm, { GRN_INSPECT_FORM_ID } from "./components/GrnInspectForm";
import GrnDetails from "./components/GrnDetails";
import { usePermissions } from "../../hooks/usePermissions";
import { getGrns, getGrnById, createGrn, inspectGrn, cancelGrn } from "../../services/grnService";
import { getSellers } from "../../services/sellerService";
import { getSuppliers } from "../../services/supplierService";
import { createOptionsLoader } from "../../utils/dropdownLoaders";
import { getAllowedGrnSources, GRN_SOURCES } from "../../utils/grnSources";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "pending_inspection", label: "Pending Inspection" },
  { value: "inspected", label: "Inspected" },
  { value: "putaway_partial", label: "Putaway Partial" },
  { value: "putaway_complete", label: "Putaway Complete" },
  { value: "cancelled", label: "Cancelled" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "All Sources" },
  { value: "gate_entry", label: "Gate Entry" },
  { value: "purchase_order", label: "Purchase Order" },
  { value: "direct", label: "Direct" },
];

// Dropdowns load from the API only when opened, 40 at a time. The seller filter lists every seller; the form
// only offers active sellers, and suppliers working under the chosen seller.
const loadAllSellers = createOptionsLoader(getSellers, (seller) => ({ value: seller.id, label: seller.name }));
const loadActiveSellers = (args) => loadAllSellers({ ...args, params: { status: "active" } });
const loadSuppliers = createOptionsLoader(getSuppliers, (supplier) => ({ value: supplier.id, label: supplier.name }));

const Grns = () => {
  const { can } = usePermissions();
  const canCreate = can("grn", "create");
  const canEdit = can("grn", "edit"); // covers inspecting and cancelling (a GRN is never deleted)
  const canFilterSeller = can("seller", "view");

  // The ways goods can be received follow the module switches; a source also needs its pages to be readable.
  const modules = useSelector((state) => state.auth.modules);
  const sources = getAllowedGrnSources(modules).filter(
    (source) =>
      source === GRN_SOURCES.DIRECT ||
      (source === GRN_SOURCES.GATE_ENTRY && can("gate-entry", "view")) ||
      (source === GRN_SOURCES.PURCHASE_ORDER && can("purchase-order", "view"))
  );

  const [grns, setGrns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [source, setSource] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [busyId, setBusyId] = useState(null);
  const [pageError, setPageError] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [inspectTarget, setInspectTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [viewTarget, setViewTarget] = useState(null);

  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  useEffect(() => {
    if (searchInput === search) return;

    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);

    return () => clearTimeout(handle);
  }, [searchInput, search]);

  const loadGrns = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, meta } = await getGrns({
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

      setGrns(data);
      setTotalPages(meta?.total_page ?? 1);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load GRNs."));
    } finally {
      setLoading(false);
    }
  }, [search, status, source, sellerId, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change; no data-fetching library is set up in this project yet
    loadGrns();
  }, [loadGrns]);

  const hasActiveFilters = Boolean(searchInput || status || source || sellerId);

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setSource("");
    setSellerId("");
    setPage(1);
  };

  const openFull = async (grn, onLoaded) => {
    try {
      setBusyId(grn.id);
      setPageError("");

      const { data } = await getGrnById(grn.id);
      onLoaded(data);
    } catch (err) {
      setPageError(getErrorMessage(err, "Failed to open the GRN."));
    } finally {
      setBusyId(null);
    }
  };

  const closeForms = () => {
    if (submitting) return;
    setCreateOpen(false);
    setInspectTarget(null);
    setFormError("");
  };

  const handleCreate = async (values) => {
    try {
      setSubmitting(true);
      setFormError("");

      await createGrn(values);

      setCreateOpen(false);
      loadGrns();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to save the GRN."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleInspect = async (values) => {
    try {
      setSubmitting(true);
      setFormError("");

      await inspectGrn(inspectTarget.id, values);

      setInspectTarget(null);
      loadGrns();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to save the inspection."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelConfirm = async () => {
    if (!cancelTarget) return;

    try {
      setCancelling(true);
      setCancelError("");

      await cancelGrn(cancelTarget.id);

      setCancelTarget(null);
      loadGrns();
    } catch (err) {
      setCancelError(getErrorMessage(err, "Failed to cancel the GRN."));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="GRN"
        description="Goods received notes: record what arrived, then what passed and what failed inspection."
      />

      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="sm:w-72">
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search by GRN number..." />
          </div>

          <div className="sm:w-52">
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
          <ErrorState message={error} onRetry={loadGrns} />
        ) : (
          <Card
            title="GRNs"
            description={hasActiveFilters ? "Filtered results" : "All goods received notes"}
            actions={
              canCreate && (
                <Button
                  icon={Plus}
                  onClick={() => {
                    setFormError("");
                    setCreateOpen(true);
                  }}
                >
                  Create GRN
                </Button>
              )
            }
          >
            {!loading && grns.length === 0 ? (
              <EmptyState
                icon={PackageCheck}
                title={hasActiveFilters ? "No GRNs match your filters" : "No GRNs yet"}
                description={
                  hasActiveFilters
                    ? "Try a different search or change the filters above."
                    : canCreate
                      ? "Use the Create GRN button above to receive the first delivery."
                      : "GRNs will appear here once goods are received."
                }
              />
            ) : (
              <>
                {pageError && (
                  <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {pageError}
                  </div>
                )}

                <GrnTable
                  grns={grns}
                  loading={loading}
                  canEdit={canEdit}
                  busyId={busyId}
                  onView={(grn) => openFull(grn, setViewTarget)}
                  onInspect={(grn) =>
                    openFull(grn, (full) => {
                      setFormError("");
                      setInspectTarget(full);
                    })
                  }
                  onCancel={(grn) => {
                    setCancelError("");
                    setCancelTarget(grn);
                  }}
                />

                {!loading && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
              </>
            )}
          </Card>
        )}
      </div>

      <Modal
        isOpen={createOpen}
        onClose={closeForms}
        size="2xl"
        headerProps={{ heading: "Create GRN", icon: PackageCheck }}
        footerProps={{
          secondaryButton: { text: "Cancel", onClick: closeForms, disabled: submitting },
          primaryButton: { text: "Create GRN", type: "submit", form: GRN_FORM_ID, loading: submitting },
        }}
      >
        {createOpen && (
          <GrnForm
            sources={sources}
            loadSellerOptions={loadActiveSellers}
            loadSupplierOptions={loadSuppliers}
            onSubmit={handleCreate}
            apiError={formError}
          />
        )}
      </Modal>

      <Modal
        isOpen={Boolean(inspectTarget)}
        onClose={closeForms}
        size="2xl"
        headerProps={{ heading: inspectTarget ? `Inspect ${inspectTarget.grnNumber}` : "Inspect", icon: PackageCheck }}
        footerProps={{
          secondaryButton: { text: "Cancel", onClick: closeForms, disabled: submitting },
          primaryButton: { text: "Save Inspection", type: "submit", form: GRN_INSPECT_FORM_ID, loading: submitting },
        }}
      >
        {inspectTarget && <GrnInspectForm key={inspectTarget.id} grn={inspectTarget} onSubmit={handleInspect} apiError={formError} />}
      </Modal>

      <Modal
        isOpen={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        size="2xl"
        headerProps={{ heading: "GRN", icon: PackageCheck }}
        footerProps={{ secondaryButton: { text: "Close", onClick: () => setViewTarget(null) } }}
      >
        {viewTarget && <GrnDetails grn={viewTarget} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onClose={() => {
          if (cancelling) return;
          setCancelTarget(null);
          setCancelError("");
        }}
        onConfirm={handleCancelConfirm}
        title="Cancel GRN"
        message={`Cancel ${cancelTarget?.grnNumber}? The quantities go back to the purchase order and the gate entry (if any) is pending again. The GRN stays on record.`}
        confirmLabel="Cancel GRN"
        variant="warning"
        loading={cancelling}
        error={cancelError}
      />
    </div>
  );
};

export default Grns;
