import { useCallback, useEffect, useState } from "react";
import { Boxes, History, PackageCheck, PackageX, SlidersHorizontal, X } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import SearchBar from "../../components/common/SearchBar";
import StatCard from "../../components/common/StatCard";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Select from "../../components/ui/Select";
import Modal from "../../components/ui/Modal";
import InventoryTable from "./components/InventoryTable";
import AdjustStockForm, { ADJUST_STOCK_FORM_ID } from "./components/AdjustStockForm";
import StockHistory from "./components/StockHistory";
import { usePermissions } from "../../hooks/usePermissions";
import { getInventory, getInventorySummary, adjustStock } from "../../services/inventoryService";
import { getCategories } from "../../services/categoryService";
import { getSellers } from "../../services/sellerService";
import { createOptionsLoader } from "../../utils/dropdownLoaders";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PAGE_SIZE = 10;

const STOCK_OPTIONS = [
  { value: "", label: "All Stock" },
  { value: "in_stock", label: "In Stock" },
  { value: "out_of_stock", label: "Out of Stock" },
];

const loadCategories = createOptionsLoader(getCategories, (category) => ({ value: category.id, label: category.name }));
const loadSellers = createOptionsLoader(getSellers, (seller) => ({ value: seller.id, label: seller.name }));

const StockOverview = () => {
  const { can } = usePermissions();
  const canEdit = can("inventory", "edit"); // increases / decreases stock
  const canFilterCategory = can("category", "view");
  const canFilterSeller = can("seller", "view");

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [stock, setStock] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // adjustTarget: { row, type } while the adjust form is open.
  const [adjustTarget, setAdjustTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [historyTarget, setHistoryTarget] = useState(null);

  useEffect(() => {
    if (searchInput === search) return;

    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);

    return () => clearTimeout(handle);
  }, [searchInput, search]);

  const loadSummary = useCallback(async () => {
    try {
      const { data } = await getInventorySummary();
      setSummary(data);
    } catch {
      // The cards are secondary: if they cannot load the list still works.
      setSummary(null);
    }
  }, []);

  const loadInventory = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, meta } = await getInventory({
        search: search || undefined,
        categoryId: categoryId || undefined,
        sellerId: sellerId || undefined,
        stock: stock || undefined,
        page,
        limit: PAGE_SIZE,
      });

      if (data.length === 0 && meta && page > meta.total_page) {
        setPage(meta.total_page);
        return;
      }

      setRows(data);
      setTotalPages(meta?.total_page ?? 1);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load inventory."));
    } finally {
      setLoading(false);
    }
  }, [search, categoryId, sellerId, stock, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change; no data-fetching library is set up in this project yet
    loadInventory();
  }, [loadInventory]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch on mount; no data-fetching library is set up in this project yet
    loadSummary();
  }, [loadSummary]);

  const hasActiveFilters = Boolean(searchInput || categoryId || sellerId || stock);

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setCategoryId("");
    setSellerId("");
    setStock("");
    setPage(1);
  };

  const closeAdjust = () => {
    if (submitting) return;
    setAdjustTarget(null);
    setFormError("");
  };

  const handleAdjust = async (values) => {
    try {
      setSubmitting(true);
      setFormError("");

      await adjustStock(adjustTarget.row.product.id, values);

      setAdjustTarget(null);
      loadInventory();
      loadSummary();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to change the stock."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Stock Overview"
        description="The stock of every product that has been put away. Increase or decrease it by hand with a reason; every change is kept in the history."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Boxes} label="Products in inventory" value={summary ? summary.products : "—"} accent="blue" />
        <StatCard icon={PackageCheck} label="In stock" value={summary ? summary.inStock : "—"} accent="green" />
        <StatCard icon={PackageX} label="Out of stock" value={summary ? summary.outOfStock : "—"} accent="red" />
      </div>

      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="sm:w-72">
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search name, SKU or scan a barcode..." />
          </div>

          <div className="sm:w-44">
            <Select
              aria-label="Filter by stock"
              value={stock}
              onChange={(e) => {
                setStock(e.target.value);
                setPage(1);
              }}
              options={STOCK_OPTIONS}
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
                loadOptions={loadCategories}
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
                loadOptions={loadSellers}
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
          <ErrorState message={error} onRetry={loadInventory} />
        ) : (
          <Card title="Stock" description={hasActiveFilters ? "Filtered results" : "All products with stock records"}>
            {!loading && rows.length === 0 ? (
              <EmptyState
                icon={Boxes}
                title={hasActiveFilters ? "No stock matches your filters" : "No stock yet"}
                description={
                  hasActiveFilters
                    ? "Try a different search or change the filters above."
                    : "Products appear here once their passed goods have been put away from a GRN."
                }
              />
            ) : (
              <>
                <InventoryTable
                  rows={rows}
                  loading={loading}
                  canEdit={canEdit}
                  onHistory={setHistoryTarget}
                  onAdjust={(row, type) => {
                    setFormError("");
                    setAdjustTarget({ row, type });
                  }}
                />

                {!loading && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
              </>
            )}
          </Card>
        )}
      </div>

      <Modal
        isOpen={Boolean(adjustTarget)}
        onClose={closeAdjust}
        size="md"
        headerProps={{ heading: "Adjust Stock", icon: SlidersHorizontal }}
        footerProps={{
          secondaryButton: { text: "Cancel", onClick: closeAdjust, disabled: submitting },
          primaryButton: { text: "Save", type: "submit", form: ADJUST_STOCK_FORM_ID, loading: submitting },
        }}
      >
        {adjustTarget && (
          <AdjustStockForm
            key={`${adjustTarget.row.id}-${adjustTarget.type}`}
            row={adjustTarget.row}
            initialType={adjustTarget.type}
            onSubmit={handleAdjust}
            apiError={formError}
          />
        )}
      </Modal>

      <Modal
        isOpen={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
        size="2xl"
        headerProps={{ heading: "Stock History", icon: History }}
        footerProps={{ secondaryButton: { text: "Close", onClick: () => setHistoryTarget(null) } }}
      >
        {historyTarget && <StockHistory row={historyTarget} />}
      </Modal>
    </div>
  );
};

export default StockOverview;
