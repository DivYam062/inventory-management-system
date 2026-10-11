import { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { CircleAlert, ClipboardCheck, DoorOpen, Hourglass, PackageCheck, Route, Warehouse, X } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import SearchBar from "../../components/common/SearchBar";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import TabToggle from "../../components/ui/TabToggle";
import Toggle from "../../components/ui/Toggle";
import Modal from "../../components/ui/Modal";
import TrackingTable from "./components/TrackingTable";
import TrackingDetails from "./components/TrackingDetails";
import StageCard from "./components/StageCard";
import { usePermissions } from "../../hooks/usePermissions";
import { getTrackers, getTrackingSummary, getTracker } from "../../services/trackingService";
import { getSellers } from "../../services/sellerService";
import { createOptionsLoader } from "../../utils/dropdownLoaders";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PAGE_SIZE = 10;

const TYPES = [
  { value: "purchase_order", label: "Purchase Orders" },
  { value: "direct", label: "Direct Deliveries" },
];

const STAGE_OPTIONS = [
  { value: "", label: "All Stages" },
  { value: "draft", label: "Draft" },
  { value: "awaiting_delivery", label: "Awaiting Delivery" },
  { value: "at_gate", label: "At the Gate" },
  { value: "awaiting_inspection", label: "Awaiting Inspection" },
  { value: "awaiting_putaway", label: "Awaiting Putaway" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const CARDS = [
  { stage: "awaiting_delivery", label: "Awaiting delivery", icon: Hourglass, accent: "gray" },
  { stage: "at_gate", label: "At the gate", icon: DoorOpen, accent: "yellow" },
  { stage: "awaiting_inspection", label: "Awaiting inspection", icon: ClipboardCheck, accent: "yellow" },
  { stage: "awaiting_putaway", label: "Awaiting putaway", icon: Warehouse, accent: "blue" },
  { stage: "completed", label: "Completed", icon: PackageCheck, accent: "green" },
];

const ROUTE_TYPES = { purchase_order: "purchase-orders", gate_entry: "gate-entries", grn: "grns" };

const loadSellers = createOptionsLoader(getSellers, (seller) => ({ value: seller.id, label: seller.name }));

const Tracking = () => {
  const { can } = usePermissions();
  const canFilterSeller = can("seller", "view");
  const companyRoute = useSelector((state) => state.auth.organization?.companyRoute);

  const [type, setType] = useState("purchase_order");
  const [trackers, setTrackers] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [stage, setStage] = useState("");
  const [needsAction, setNeedsAction] = useState(false);
  const [sellerId, setSellerId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [busyKey, setBusyKey] = useState(null);
  const [pageError, setPageError] = useState("");
  const [viewTarget, setViewTarget] = useState(null);

  useEffect(() => {
    if (searchInput === search) return;

    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);

    return () => clearTimeout(handle);
  }, [searchInput, search]);

  const loadTrackers = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, meta } = await getTrackers({
        type,
        search: search || undefined,
        sellerId: sellerId || undefined,
        stage: stage || undefined,
        needsAction: needsAction ? "true" : undefined,
        page,
        limit: PAGE_SIZE,
      });

      if (data.length === 0 && meta && page > meta.total_page) {
        setPage(meta.total_page);
        return;
      }

      setTrackers(data);
      setTotalPages(meta?.total_page ?? 1);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load tracking."));
    } finally {
      setLoading(false);
    }
  }, [type, search, sellerId, stage, needsAction, page]);

  const loadSummary = useCallback(async () => {
    try {
      const { data } = await getTrackingSummary({ type, search: search || undefined, sellerId: sellerId || undefined });
      setSummary(data);
    } catch {
      // The cards are secondary: if they cannot load the list still works.
      setSummary(null);
    }
  }, [type, search, sellerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change; no data-fetching library is set up in this project yet
    loadTrackers();
  }, [loadTrackers]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change; no data-fetching library is set up in this project yet
    loadSummary();
  }, [loadSummary]);

  const hasActiveFilters = Boolean(searchInput || stage || needsAction || sellerId);

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStage("");
    setNeedsAction(false);
    setSellerId("");
    setPage(1);
  };

  const changeType = (nextType) => {
    if (nextType === type) return;
    setType(nextType);
    setPage(1);
  };

  const refresh = () => {
    loadTrackers();
    loadSummary();
  };

  const openTracker = async (tracker) => {
    const key = `${tracker.type}-${tracker.id}`;

    try {
      setBusyKey(key);
      setPageError("");

      const { data } = await getTracker(ROUTE_TYPES[tracker.type], tracker.id);
      setViewTarget(data);
    } catch (err) {
      setPageError(getErrorMessage(err, "Failed to open this record."));
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Stock Tracking"
        description="Where each purchase order has got to - Purchase Order, Gate Entry, GRN, Putaway - and what has to be done on it next."
        actions={
          <Button variant="outline" onClick={refresh}>
            Refresh
          </Button>
        }
      />

      <div className="mb-6 grid auto-rows-fr grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StageCard
          icon={CircleAlert}
          label="Needs action"
          value={summary ? summary.needsAction : "—"}
          accent="red"
          isActive={needsAction}
          onClick={() => {
            setNeedsAction((previous) => !previous);
            setPage(1);
          }}
        />

        {CARDS.map(({ stage: cardStage, label, icon, accent }) => (
          <StageCard
            key={cardStage}
            icon={icon}
            label={label}
            value={summary ? summary.stages[cardStage] : "—"}
            accent={accent}
            isActive={stage === cardStage}
            onClick={() => {
              setStage((previous) => (previous === cardStage ? "" : cardStage));
              setPage(1);
            }}
          />
        ))}
      </div>

      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3">
          <TabToggle
            aria-label="What to track"
            name="type"
            options={TYPES}
            value={type}
            onChange={(event) => changeType(event.target.value)}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="sm:w-72">
              <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search by document number..." />
            </div>

            <div className="sm:w-52">
              <Select
                aria-label="Filter by stage"
                value={stage}
                onChange={(e) => {
                  setStage(e.target.value);
                  setPage(1);
                }}
                options={STAGE_OPTIONS}
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
                  loadOptions={loadSellers}
                  isClearable
                  placeholder="All Sellers"
                  noOptionsText="No sellers found"
                />
              </div>
            )}

            <Toggle
              label="Needs action only"
              isChecked={needsAction}
              onChange={(event) => {
                setNeedsAction(event.target.checked);
                setPage(1);
              }}
            />

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" icon={X} onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </Card>

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={loadTrackers} />
        ) : (
          <Card
            title={type === "purchase_order" ? "Purchase Orders" : "Direct Deliveries"}
            description={
              type === "purchase_order"
                ? "Every purchase order with its gate entries, GRNs and putaways."
                : "Goods received without a purchase order: from a gate entry or straight on a GRN."
            }
          >
            {!loading && trackers.length === 0 ? (
              <EmptyState
                icon={Route}
                title={hasActiveFilters ? "Nothing matches your filters" : type === "purchase_order" ? "No purchase orders yet" : "No direct deliveries yet"}
                description={
                  hasActiveFilters
                    ? "Try a different search or change the filters above."
                    : "They will appear here with their progress as soon as they are created."
                }
              />
            ) : (
              <>
                {pageError && (
                  <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {pageError}
                  </div>
                )}

                <TrackingTable trackers={trackers} loading={loading} busyKey={busyKey} onView={openTracker} />

                {!loading && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
              </>
            )}
          </Card>
        )}
      </div>

      <Modal
        isOpen={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        size="2xl"
        headerProps={{ heading: viewTarget ? `Stock Tracking ${viewTarget.number}` : "Stock Tracking", icon: Route }}
        footerProps={{ secondaryButton: { text: "Close", onClick: () => setViewTarget(null) } }}
      >
        {viewTarget && <TrackingDetails tracker={viewTarget} companyRoute={companyRoute} onNavigate={() => setViewTarget(null)} />}
      </Modal>
    </div>
  );
};

export default Tracking;
