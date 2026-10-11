import { useCallback, useEffect, useState } from "react";
import { ClipboardList, Plus, Printer, X } from "lucide-react";
import { useSelector } from "react-redux";
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
import PurchaseOrderTable from "./components/PurchaseOrderTable";
import PurchaseOrderForm, { PURCHASE_ORDER_FORM_ID } from "./components/PurchaseOrderForm";
import PurchaseOrderDetails from "./components/PurchaseOrderDetails";
import { usePermissions } from "../../hooks/usePermissions";
import {
  getPurchaseOrders,
  getPurchaseOrderById,
  createPurchaseOrder,
  updatePurchaseOrder,
  issuePurchaseOrder,
  cancelPurchaseOrder,
  deletePurchaseOrder,
} from "../../services/purchaseOrderService";
import { getSellers } from "../../services/sellerService";
import { getSuppliers } from "../../services/supplierService";
import { getCurrencies } from "../../services/referenceService";
import { createOptionsLoader } from "../../utils/dropdownLoaders";
import { printPurchaseOrder } from "../../utils/printPurchaseOrder";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "", label: "All Status" },
  { value: "draft", label: "Draft" },
  { value: "issued", label: "Issued" },
  { value: "partially_received", label: "Partially Received" },
  { value: "received", label: "Received" },
  { value: "cancelled", label: "Cancelled" },
];

// Dropdowns load from the API only when opened, 40 at a time. The seller filter lists every seller; the form
// only offers active sellers, and suppliers working under the chosen seller (see PurchaseOrderForm).
const loadAllSellers = createOptionsLoader(getSellers, (seller) => ({ value: seller.id, label: seller.name }));
const loadActiveSellers = (args) => loadAllSellers({ ...args, params: { status: "active" } });
const loadSuppliers = createOptionsLoader(getSuppliers, (supplier) => ({ value: supplier.id, label: supplier.name }));
const loadCurrencies = createOptionsLoader(getCurrencies, (currency) => ({
  value: currency.code,
  label: `${currency.code} - ${currency.name}`,
}));

const PurchaseOrders = () => {
  const { can } = usePermissions();
  const organization = useSelector((state) => state.auth.organization);
  const canCreate = can("purchase-order", "create");
  const canEdit = can("purchase-order", "edit"); // also covers issue, cancel and delete
  const canFilterSeller = can("seller", "view");

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [busyId, setBusyId] = useState(null);
  const [pageError, setPageError] = useState("");

  // formTarget: null = closed, "new" = create form, otherwise the full order being edited.
  const [formTarget, setFormTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const [viewTarget, setViewTarget] = useState(null);

  // action: { type: "issue" | "cancel" | "delete", order }
  const [action, setAction] = useState(null);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    if (searchInput === search) return;

    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);

    return () => clearTimeout(handle);
  }, [searchInput, search]);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, meta } = await getPurchaseOrders({
        search: search || undefined,
        status: status || undefined,
        sellerId: sellerId || undefined,
        page,
        limit: PAGE_SIZE,
      });

      if (data.length === 0 && meta && page > meta.total_page) {
        setPage(meta.total_page);
        return;
      }

      setOrders(data);
      setTotalPages(meta?.total_page ?? 1);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load purchase orders."));
    } finally {
      setLoading(false);
    }
  }, [search, status, sellerId, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change; no data-fetching library is set up in this project yet
    loadOrders();
  }, [loadOrders]);

  const hasActiveFilters = Boolean(searchInput || status || sellerId);

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setStatus("");
    setSellerId("");
    setPage(1);
  };

  const openFull = async (order, onLoaded) => {
    try {
      setBusyId(order.id);
      setPageError("");

      const { data } = await getPurchaseOrderById(order.id);
      onLoaded(data);
    } catch (err) {
      setPageError(getErrorMessage(err, "Failed to open the purchase order."));
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
        await createPurchaseOrder(values);
      } else {
        await updatePurchaseOrder(formTarget.id, values);
      }

      setFormTarget(null);
      loadOrders();
    } catch (err) {
      setFormError(getErrorMessage(err, "Failed to save purchase order."));
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

    const { type, order } = action;

    try {
      setActing(true);
      setActionError("");

      if (type === "issue") await issuePurchaseOrder(order.id);
      if (type === "cancel") await cancelPurchaseOrder(order.id);
      if (type === "delete") await deletePurchaseOrder(order.id);

      setAction(null);

      if (type === "delete" && orders.length === 1 && page > 1) {
        setPage((previous) => previous - 1);
      } else {
        loadOrders();
      }
    } catch (err) {
      setActionError(getErrorMessage(err, `Failed to ${type} the purchase order.`));
    } finally {
      setActing(false);
    }
  };

  const ACTION_COPY = {
    issue: {
      title: "Issue Purchase Order",
      confirmLabel: "Issue",
      variant: "info",
      message: (order) => `Issue ${order?.poNumber}? It can no longer be edited or deleted, and goods can be received against it.`,
    },
    cancel: {
      title: "Cancel Purchase Order",
      confirmLabel: "Cancel Order",
      variant: "warning",
      message: (order) => `Cancel ${order?.poNumber}? It stays on record but nothing more can be received against it.`,
    },
    delete: {
      title: "Delete Purchase Order",
      confirmLabel: "Delete",
      variant: "danger",
      message: (order) => `Delete draft ${order?.poNumber}? This cannot be undone.`,
    },
  };
  const actionCopy = action ? ACTION_COPY[action.type] : null;

  const isEditing = formTarget && formTarget !== "new";

  return (
    <div>
      <PageHeader
        title="Purchase Orders"
        description="Orders raised to a seller, through one of its suppliers, for the products made under that seller."
      />

      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="sm:w-72">
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search by PO number..." />
          </div>

          <div className="sm:w-48">
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
          <ErrorState message={error} onRetry={loadOrders} />
        ) : (
          <Card
            title="Purchase Orders"
            description={hasActiveFilters ? "Filtered results" : "All purchase orders"}
            actions={
              canCreate && (
                <Button icon={Plus} onClick={() => openForm("new")}>
                  Create Purchase Order
                </Button>
              )
            }
          >
            {!loading && orders.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={hasActiveFilters ? "No purchase orders match your filters" : "No purchase orders yet"}
                description={
                  hasActiveFilters
                    ? "Try a different search or change the filters above."
                    : canCreate
                      ? "Use the Create Purchase Order button above to raise the first one."
                      : "Purchase orders will appear here once they are created."
                }
              />
            ) : (
              <>
                {pageError && (
                  <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
                    {pageError}
                  </div>
                )}

                <PurchaseOrderTable
                  orders={orders}
                  loading={loading}
                  canEdit={canEdit}
                  busyId={busyId}
                  onView={(order) => openFull(order, setViewTarget)}
                  onPrint={(order) => openFull(order, (full) => printPurchaseOrder(full, organization))}
                  onEdit={(order) => openFull(order, openForm)}
                  onIssue={(order) => {
                    setActionError("");
                    setAction({ type: "issue", order });
                  }}
                  onCancel={(order) => {
                    setActionError("");
                    setAction({ type: "cancel", order });
                  }}
                  onDelete={(order) => {
                    setActionError("");
                    setAction({ type: "delete", order });
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
        size="2xl"
        headerProps={{
          heading: isEditing ? `Edit ${formTarget.poNumber}` : "Create Purchase Order",
          icon: ClipboardList,
        }}
        footerProps={{
          secondaryButton: { text: "Cancel", onClick: closeForm, disabled: submitting },
          primaryButton: {
            text: isEditing ? "Save Changes" : "Create Purchase Order",
            type: "submit",
            form: PURCHASE_ORDER_FORM_ID,
            loading: submitting,
          },
        }}
      >
        {formTarget && (
          <PurchaseOrderForm
            key={isEditing ? formTarget.id : "new"}
            order={isEditing ? formTarget : null}
            loadSellerOptions={loadActiveSellers}
            loadSupplierOptions={loadSuppliers}
            loadCurrencyOptions={loadCurrencies}
            onSubmit={handleSubmit}
            apiError={formError}
          />
        )}
      </Modal>

      <Modal
        isOpen={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        size="2xl"
        headerProps={{ heading: "Purchase Order", icon: ClipboardList }}
        footerProps={{
          secondaryButton: { text: "Close", onClick: () => setViewTarget(null) },
          primaryButton: { text: "Print", icon: Printer, onClick: () => printPurchaseOrder(viewTarget, organization) },
        }}
      >
        {viewTarget && <PurchaseOrderDetails order={viewTarget} />}
      </Modal>

      <ConfirmDialog
        open={Boolean(action)}
        onClose={closeAction}
        onConfirm={handleActionConfirm}
        title={actionCopy?.title}
        message={actionCopy?.message(action?.order)}
        confirmLabel={actionCopy?.confirmLabel}
        variant={actionCopy?.variant}
        loading={acting}
        error={actionError}
      />
    </div>
  );
};

export default PurchaseOrders;
