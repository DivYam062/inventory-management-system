import { useCallback, useEffect, useState } from "react";
import { Plus, Warehouse, X } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import SearchBar from "../../components/common/SearchBar";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import PutawayTable from "./components/PutawayTable";
import PutawayForm, { PUTAWAY_FORM_ID } from "./components/PutawayForm";
import PutawayDetails from "./components/PutawayDetails";
import { usePermissions } from "../../hooks/usePermissions";
import { getPutaways, getPutawayById, createPutaway } from "../../services/putawayService";
import { getSellers } from "../../services/sellerService";
import { createOptionsLoader } from "../../utils/dropdownLoaders";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PAGE_SIZE = 10;

// The seller dropdown loads from the API only when opened, 40 at a time.
const loadAllSellers = createOptionsLoader(getSellers, (seller) => ({ value: seller.id, label: seller.name }));

const Putaway = () => {
  const { can } = usePermissions();
  const canCreate = can("putaway", "create"); // putaway has no edit or delete
  const canFilterSeller = can("seller", "view");

  const [putaways, setPutaways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Opening a putaway for view loads the full putaway (with items) first.
  const [busyId, setBusyId] = useState(null);
  const [pageError, setPageError] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [viewTarget, setViewTarget] = useState(null);

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

  const loadPutaways = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, meta } = await getPutaways({
        search: search || undefined,
        sellerId: sellerId || undefined,
        page,
        limit: PAGE_SIZE,
      });

      if (data.length === 0 && meta && page > meta.total_page) {
        setPage(meta.total_page);
        return;
      }

      setPutaways(data);
      setTotalPages(meta?.total_page ?? 1);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load putaways."));
    } finally {
      setLoading(false);
    }
  }, [search, sellerId, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change; no data-fetching library is set up in this project yet
    loadPutaways();
  }, [loadPutaways]);

  const hasActiveFilters = Boolean(searchInput || sellerId);

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setSellerId("");
    setPage(1);
  };

  const openView = async (putaway) => {
    try {
      setBusyId(putaway.id);
      setPageError("");

      const { data } = await getPutawayById(putaway.id);
      setViewTarget(data);
    } catch (err) {
      setPageError(getErrorMessage(err, "Failed to open the putaway."));
    } finally {
      setBusyId(null);
    }
  };

  const closeForm = () => {
    if (submitting) return;
    setFormOpen(false);
    setFormError("");
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);
      setFormError("");

      await createPutaway(values);

      setFormOpen(false);
      loadPutaways();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to save the putaway."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Putaway"
        description="Move the passed goods of an inspected GRN into inventory. Failed goods never enter inventory."
      />

      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="sm:w-72">
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search by putaway number..." />
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
          <ErrorState message={error} onRetry={loadPutaways} />
        ) : (
          <Card
            title="Putaways"
            description={hasActiveFilters ? "Filtered results" : "All putaways"}
            actions={
              canCreate && (
                <Button
                  icon={Plus}
                  onClick={() => {
                    setFormError("");
                    setFormOpen(true);
                  }}
                >
                  Create Putaway
                </Button>
              )
            }
          >
            {!loading && putaways.length === 0 ? (
              <EmptyState
                icon={Warehouse}
                title={hasActiveFilters ? "No putaways match your filters" : "No putaways yet"}
                description={
                  hasActiveFilters
                    ? "Try a different search or change the filters above."
                    : canCreate
                      ? "Use the Create Putaway button above to put the first inspected GRN away."
                      : "Putaways will appear here once goods are put away."
                }
              />
            ) : (
              <>
                {pageError && (
                  <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {pageError}
                  </div>
                )}

                <PutawayTable putaways={putaways} loading={loading} busyId={busyId} onView={openView} />

                {!loading && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
              </>
            )}
          </Card>
        )}
      </div>

      <Modal
        isOpen={formOpen}
        onClose={closeForm}
        size="2xl"
        headerProps={{ heading: "Create Putaway", icon: Warehouse }}
        footerProps={{
          secondaryButton: { text: "Cancel", onClick: closeForm, disabled: submitting },
          primaryButton: { text: "Put Away", type: "submit", form: PUTAWAY_FORM_ID, loading: submitting },
        }}
      >
        {formOpen && <PutawayForm onSubmit={handleSubmit} apiError={formError} />}
      </Modal>

      <Modal
        isOpen={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        size="2xl"
        headerProps={{ heading: "Putaway", icon: Warehouse }}
        footerProps={{ secondaryButton: { text: "Close", onClick: () => setViewTarget(null) } }}
      >
        {viewTarget && <PutawayDetails putaway={viewTarget} />}
      </Modal>
    </div>
  );
};

export default Putaway;
