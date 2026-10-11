import { useCallback, useState } from "react";
import { Plus, ScanBarcode, Trash2 } from "lucide-react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import TabToggle from "../../../components/ui/TabToggle";
import { RESTRICTIONS } from "../../../utils/inputRestrictions";
import { DROPDOWN_PAGE_SIZE } from "../../../utils/dropdownLoaders";
import { GRN_SOURCES } from "../../../utils/grnSources";
import { nowInputDateTime } from "../../../utils/formatDate";
import { getGateEntries } from "../../../services/gateEntryService";
import { getPurchaseOrders } from "../../../services/purchaseOrderService";
import { getProducts } from "../../../services/productService";
import { getGrnSource } from "../../../services/grnService";
import { getErrorMessage } from "../../../utils/getErrorMessage";

export const GRN_FORM_ID = "grn-form";

const SOURCE_LABELS = {
  [GRN_SOURCES.GATE_ENTRY]: "Gate Entry",
  [GRN_SOURCES.PURCHASE_ORDER]: "Purchase Order",
  [GRN_SOURCES.DIRECT]: "Seller & Supplier",
};

const roundTo3 = (value) => Math.round(value * 1000) / 1000;

let rowCounter = 0;
const blankRow = () => ({ key: `row-${(rowCounter += 1)}`, productId: "", receivedQty: "", remarks: "" });

const productOption = (product) => ({ value: product.id, label: `${product.name} (${product.sku})` });

const gateEntryOption = (entry) => ({
  value: entry.id,
  label: `${entry.gateEntryNumber} - ${entry.seller?.name ?? ""}${entry.purchaseOrder ? ` (${entry.purchaseOrder.poNumber})` : ""}`,
});

const orderOption = (order) => ({ value: order.id, label: `${order.poNumber} - ${order.seller?.name ?? ""}` });

const QuantityInput = (props) => (
  <Input
    inputMode="decimal"
    restrictions={[{ name: RESTRICTIONS.DECIMAL, upto: 3 }, { name: RESTRICTIONS.MAX_LENGTH, max: 14 }]}
    {...props}
  />
);

const ColumnLabel = ({ children }) => (
  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 md:hidden">{children}</span>
);

// Receive goods (create a GRN). Rendered inside a Modal; the modal footer's submit button targets this form
// through GRN_FORM_ID.
//
// The source decides where the goods come from (the choices follow the module switches, see utils/grnSources.js):
//   - a gate entry: its seller and supplier are used; when it was made against a purchase order the order's
//     items are listed, otherwise products are added by hand;
//   - a purchase order: its items are listed with how much is still to receive;
//   - directly: choose the seller, then one of its suppliers, then add products by hand.
// A listed item starts with the quantity still to receive; clear it (or set 0) for an item that did not arrive.
// More than ordered is accepted only when over-receiving is allowed for the order.
const GrnForm = ({ sources, loadSellerOptions, loadSupplierOptions, onSubmit, apiError = "" }) => {
  const [values, setValues] = useState({
    source: sources[0],
    refId: "",
    sellerId: "",
    supplierId: "",
    receivedAt: nowInputDateTime(),
    challanNumber: "",
    notes: "",
  });
  const [errors, setErrors] = useState({});

  // What the chosen gate entry / purchase order gives: { gateEntry, purchaseOrder, seller, supplier, items }.
  const [info, setInfo] = useState(null);
  const [infoLoading, setInfoLoading] = useState(false);

  // listed: one entry per purchase order item { productId, receivedQty, remarks }; manual: rows added by hand.
  const [listed, setListed] = useState({});
  const [manualRows, setManualRows] = useState([blankRow()]);
  const [knownProducts, setKnownProducts] = useState(() => new Map());

  // Barcode scanning: a scanner types the code and presses Enter; every scan adds 1 to that item.
  const [scanCode, setScanCode] = useState("");
  const [scanMessage, setScanMessage] = useState(null); // { type: "success" | "error", text }
  const [scanning, setScanning] = useState(false);

  const isDirect = values.source === GRN_SOURCES.DIRECT;
  const hasOrderItems = Boolean(info?.purchaseOrder) && info.items.length > 0;
  const needsManualRows = isDirect ? true : Boolean(info) && !info.purchaseOrder;
  const sellerId = isDirect ? values.sellerId : info?.seller?.id ?? "";

  const loadGateEntryOptions = useCallback(async ({ search, page }) => {
    const { data, meta } = await getGateEntries({
      status: "pending",
      search: search || undefined,
      page: page + 1,
      limit: DROPDOWN_PAGE_SIZE,
    });
    return { options: data.map(gateEntryOption), hasMore: Boolean(meta) && meta.current_page < meta.total_page };
  }, []);

  const loadOrderOptions = useCallback(async ({ search, page }) => {
    const { data, meta } = await getPurchaseOrders({
      status: "issued,partially_received",
      search: search || undefined,
      page: page + 1,
      limit: DROPDOWN_PAGE_SIZE,
    });
    return { options: data.map(orderOption), hasMore: Boolean(meta) && meta.current_page < meta.total_page };
  }, []);

  const loadProductOptions = useCallback(async ({ search, page, params }) => {
    const { data, meta } = await getProducts({
      ...params,
      search: search || undefined,
      page: page + 1,
      limit: DROPDOWN_PAGE_SIZE,
    });

    setKnownProducts((previous) => {
      const next = new Map(previous);
      data.forEach((product) => next.set(product.id, product));
      return next;
    });

    return { options: data.map(productOption), hasMore: Boolean(meta) && meta.current_page < meta.total_page };
  }, []);

  const clearError = (name) => setErrors((previous) => ({ ...previous, [name]: undefined }));

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    clearError(name);
  };

  const resetSource = (source) => {
    setValues((previous) => ({ ...previous, source, refId: "", sellerId: "", supplierId: "", challanNumber: "" }));
    setInfo(null);
    setListed({});
    setManualRows([blankRow()]);
    setErrors({});
  };

  const handleSourceChange = (source) => {
    if (source !== values.source) resetSource(source);
  };

  // Picking a gate entry / purchase order loads its seller, supplier and items.
  const handleRefChange = async (event) => {
    const refId = event.target.value;

    setValues((previous) => ({ ...previous, refId }));
    clearError("refId");
    setInfo(null);
    setListed({});
    setManualRows([blankRow()]);
    setScanMessage(null);

    if (!refId) return;

    try {
      setInfoLoading(true);

      const { data } = await getGrnSource(
        values.source === GRN_SOURCES.GATE_ENTRY ? { gateEntryId: refId } : { purchaseOrderId: refId }
      );

      setInfo(data);
      setValues((previous) => ({
        ...previous,
        supplierId: data.supplier.id,
        challanNumber: previous.challanNumber || data.gateEntry?.challanNumber || "",
      }));
      setListed(Object.fromEntries(data.items.map((item) => [item.productId, { receivedQty: "", remarks: "" }])));
    } catch (err) {
      setErrors((previous) => ({ ...previous, refId: getErrorMessage(err, "Could not load this record.") }));
    } finally {
      setInfoLoading(false);
    }
  };

  const handleSellerChange = (event) => {
    const nextSellerId = event.target.value;
    if (nextSellerId === values.sellerId) return;

    setValues((previous) => ({ ...previous, sellerId: nextSellerId, supplierId: "" }));
    setManualRows([blankRow()]);
    clearError("sellerId");
  };

  // Everything still pending on the order, in one click (a full delivery).
  const fillPending = () => {
    setListed((previous) =>
      Object.fromEntries(
        info.items.map((item) => [
          item.productId,
          { ...previous[item.productId], receivedQty: item.pendingQty > 0 ? String(item.pendingQty) : "" },
        ])
      )
    );
    clearError("items");
  };

  // One scanned code: adds 1 to the matching item (or adds the item to the list).
  const handleScan = async (rawCode) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    if (hasOrderItems) {
      const item = info.items.find((candidate) => candidate.product?.barcode?.toUpperCase() === code);
      if (!item) {
        setScanMessage({ type: "error", text: `No item on ${info.purchaseOrder.poNumber} has the barcode ${code}.` });
        return;
      }

      const next = roundTo3((Number(listed[item.productId]?.receivedQty) || 0) + 1);
      updateListed(item.productId, { receivedQty: String(next) });
      setScanMessage({ type: "success", text: `${item.product.name}: ${next} ${item.unit}` });
      return;
    }

    try {
      setScanning(true);

      const { data } = await getProducts({ barcode: code, sellerId, status: "active", limit: 1 });
      const product = data[0];
      if (!product) {
        setScanMessage({ type: "error", text: `No active product under this seller has the barcode ${code}.` });
        return;
      }

      setKnownProducts((previous) => new Map(previous).set(product.id, product));

      const existing = manualRows.find((row) => row.productId === product.id);
      const next = existing ? roundTo3((Number(existing.receivedQty) || 0) + 1) : 1;

      setManualRows((previous) => {
        const current = previous.find((row) => row.productId === product.id);
        if (current) {
          return previous.map((row) => (row.key === current.key ? { ...row, receivedQty: String(next) } : row));
        }

        const empty = previous.find((row) => !row.productId);
        if (empty) {
          return previous.map((row) => (row.key === empty.key ? { ...row, productId: product.id, receivedQty: "1" } : row));
        }

        return [...previous, { ...blankRow(), productId: product.id, receivedQty: "1" }];
      });
      clearError("items");
      setScanMessage({ type: "success", text: `${product.name}: ${next} ${product.unit}` });
    } catch (err) {
      setScanMessage({ type: "error", text: getErrorMessage(err, "Could not look up that barcode.") });
    } finally {
      setScanning(false);
    }
  };

  const handleScanKeyDown = (event) => {
    if (event.key !== "Enter") return;

    // A scanner ends the code with Enter: that must not submit the form.
    event.preventDefault();
    const code = scanCode;
    setScanCode("");
    handleScan(code);
  };

  const updateListed = (productId, changes) => {
    setListed((previous) => ({ ...previous, [productId]: { ...previous[productId], ...changes } }));
    clearError("items");
  };

  const updateManual = (key, changes) => {
    setManualRows((previous) => previous.map((row) => (row.key === key ? { ...row, ...changes } : row)));
    clearError("items");
  };

  const removeManual = (key) =>
    setManualRows((previous) => (previous.length === 1 ? [blankRow()] : previous.filter((row) => row.key !== key)));

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (values.source !== GRN_SOURCES.DIRECT && !values.refId) {
      nextErrors.refId = values.source === GRN_SOURCES.GATE_ENTRY ? "Select a gate entry" : "Select a purchase order";
    }
    if (isDirect) {
      if (!values.sellerId) nextErrors.sellerId = "Select a seller";
      if (!values.supplierId) nextErrors.supplierId = "Select a supplier";
    }

    if (!values.receivedAt) nextErrors.receivedAt = "Received time is required";
    else if (new Date(values.receivedAt).getTime() > Date.now() + 5 * 60 * 1000) nextErrors.receivedAt = "Cannot be in the future";

    let items = [];

    if (hasOrderItems) {
      const allowOver = info.purchaseOrder.allowOverReceiving;

      info.items.forEach((item) => {
        const row = listed[item.productId] ?? {};
        const quantity = Number(row.receivedQty);
        if (!(quantity > 0)) return;

        if (!allowOver && quantity > item.pendingQty + 1e-9) {
          nextErrors.items = `${item.product?.name ?? "An item"}: only ${item.pendingQty} ${item.unit} left on the order. Over-receiving is not allowed.`;
        }
        items.push({ productId: item.productId, receivedQty: quantity, remarks: row.remarks?.trim() ?? "" });
      });
    } else if (needsManualRows) {
      const seen = new Set();
      const rowErrors = manualRows.map((row) => {
        const rowError = {};
        if (!row.productId) rowError.productId = "Select a product";
        else if (seen.has(row.productId)) rowError.productId = "Already on the GRN";
        else seen.add(row.productId);
        if (!(Number(row.receivedQty) > 0)) rowError.receivedQty = "Enter a quantity";
        return rowError;
      });
      if (rowErrors.some((rowError) => Object.keys(rowError).length > 0)) nextErrors.rows = rowErrors;

      items = manualRows.map((row) => ({ productId: row.productId, receivedQty: Number(row.receivedQty), remarks: row.remarks.trim() }));
    }

    if (!nextErrors.rows && !nextErrors.items && items.length === 0) {
      nextErrors.items = hasOrderItems ? "Enter the quantity received for at least one item" : "Add at least one item";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const common = {
      source: values.source,
      items,
      receivedAt: new Date(values.receivedAt).toISOString(),
      challanNumber: values.challanNumber.trim(),
      notes: values.notes.trim(),
    };

    if (values.source === GRN_SOURCES.GATE_ENTRY) onSubmit({ ...common, gateEntryId: values.refId });
    else if (values.source === GRN_SOURCES.PURCHASE_ORDER) onSubmit({ ...common, purchaseOrderId: values.refId });
    else onSubmit({ ...common, sellerId: values.sellerId, supplierId: values.supplierId });
  };

  const chosenProductIds = manualRows.map((row) => row.productId).filter(Boolean);

  // Total quantity entered so far, and how many items it covers.
  const entered = hasOrderItems
    ? info.items.map((item) => Number(listed[item.productId]?.receivedQty) || 0)
    : manualRows.map((row) => Number(row.receivedQty) || 0);
  const totalReceived = roundTo3(entered.reduce((sum, quantity) => sum + quantity, 0));
  const itemsReceived = entered.filter((quantity) => quantity > 0).length;

  return (
    <form id={GRN_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-6">
      {apiError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {apiError}
        </div>
      )}

      {sources.length > 1 && (
        <TabToggle
          label="Goods come from"
          name="source"
          options={sources.map((source) => ({ value: source, label: SOURCE_LABELS[source] }))}
          value={values.source}
          onChange={(event) => handleSourceChange(event.target.value)}
        />
      )}

      {values.source === GRN_SOURCES.GATE_ENTRY && (
        <Select
          label="Gate Entry"
          name="refId"
          value={values.refId}
          onChange={handleRefChange}
          isAsync
          loadOptions={loadGateEntryOptions}
          error={errors.refId}
          isRequired
          placeholder="Select a gate entry"
          noOptionsText="No pending gate entries found"
          helperText="Only pending gate entries (goods that arrived and are not yet received)."
        />
      )}

      {values.source === GRN_SOURCES.PURCHASE_ORDER && (
        <Select
          label="Purchase Order"
          name="refId"
          value={values.refId}
          onChange={handleRefChange}
          isAsync
          loadOptions={loadOrderOptions}
          error={errors.refId}
          isRequired
          placeholder="Select a purchase order"
          noOptionsText="No issued purchase orders found"
        />
      )}

      {isDirect && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Select
            label="Seller"
            name="sellerId"
            value={values.sellerId}
            onChange={handleSellerChange}
            isAsync
            loadOptions={loadSellerOptions}
            error={errors.sellerId}
            isRequired
            placeholder="Select a seller"
            noOptionsText="No active sellers found"
          />
          <Select
            label="Supplier"
            name="supplierId"
            value={values.supplierId}
            onChange={handleChange}
            isAsync
            loadOptions={loadSupplierOptions}
            loadParams={{ sellerId: values.sellerId, status: "active" }}
            isDisabled={!values.sellerId}
            error={errors.supplierId}
            isRequired
            placeholder={values.sellerId ? "Select a supplier" : "Select a seller first"}
            noOptionsText="No active suppliers work under this seller"
          />
        </div>
      )}

      {infoLoading && <p className="text-sm text-gray-500">Loading...</p>}

      {info && (
        <dl className="grid grid-cols-2 gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm sm:grid-cols-4">
          {info.gateEntry && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Gate Entry</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{info.gateEntry.gateEntryNumber}</dd>
            </div>
          )}
          {info.purchaseOrder && (
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Purchase Order</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{info.purchaseOrder.poNumber}</dd>
            </div>
          )}
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Seller</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{info.seller.name}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Supplier</dt>
            <dd className="mt-0.5 font-medium text-gray-900">{info.supplier.name}</dd>
          </div>
        </dl>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Received At"
          name="receivedAt"
          type="datetime-local"
          value={values.receivedAt}
          onChange={handleChange}
          error={errors.receivedAt}
          isRequired
        />
        <Input
          label="Challan / Invoice No."
          name="challanNumber"
          value={values.challanNumber}
          onChange={handleChange}
          maxLength={50}
          placeholder="Optional"
        />
      </div>

      {(hasOrderItems || needsManualRows) && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700">
              Items received<span className="ml-0.5 text-red-500">*</span>
            </p>
            {needsManualRows && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={Plus}
                onClick={() => setManualRows((previous) => [...previous, blankRow()])}
                disabled={!sellerId}
              >
                Add Item
              </Button>
            )}
          </div>

          {errors.items && (
            <p role="alert" className="mb-2 text-sm text-red-600">
              {errors.items}
            </p>
          )}

          {(hasOrderItems || sellerId) && (
            <div className="mb-3">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Input
                    label="Scan Barcode"
                    value={scanCode}
                    onChange={(event) => setScanCode(event.target.value)}
                    onKeyDown={handleScanKeyDown}
                    isDisabled={scanning}
                    autoComplete="off"
                    placeholder="Scan an item's barcode (or type it and press Enter). Each scan adds 1"
                  />
                </div>
                <ScanBarcode size={22} className="mb-2.5 shrink-0 text-gray-400" aria-hidden="true" />
              </div>

              {scanMessage && (
                <p
                  role={scanMessage.type === "error" ? "alert" : "status"}
                  className={`mt-1.5 text-sm ${scanMessage.type === "error" ? "text-red-600" : "text-green-700"}`}
                >
                  {scanMessage.text}
                </p>
              )}
            </div>
          )}

          {hasOrderItems && (
            <>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-gray-500">
                  {info.purchaseOrder.allowOverReceiving
                    ? "Over-receiving is allowed for this order: you can receive more than is pending."
                    : "Enter what arrived for each item, or scan the barcodes. Leave an item empty if it did not arrive."}
                </p>
                <Button type="button" variant="ghost" size="sm" onClick={fillPending}>
                  Fill pending quantities
                </Button>
              </div>

              <div
                aria-hidden="true"
                className="mb-1 hidden gap-3 px-3 text-xs font-medium uppercase tracking-wide text-gray-500 md:grid md:grid-cols-12"
              >
                <span className="col-span-4">Product</span>
                <span className="col-span-2 text-right">Ordered</span>
                <span className="col-span-2 text-right">Received so far</span>
                <span className="col-span-2">Receive now</span>
                <span className="col-span-2">Remarks (optional)</span>
              </div>

              <div className="space-y-3">
                {info.items.map((item) => {
                  const row = listed[item.productId] ?? { receivedQty: "", remarks: "" };
                  return (
                    <div key={item.productId} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-12 md:items-center">
                      <div className="md:col-span-4">
                        <p className="text-sm font-medium text-gray-900">{item.product?.name ?? "—"}</p>
                        <p className="text-xs text-gray-500">{item.product?.sku}</p>
                      </div>
                      <p className="text-sm tabular-nums text-gray-700 md:col-span-2 md:text-right">
                        <ColumnLabel>Ordered</ColumnLabel>
                        {item.orderedQty} {item.unit}
                      </p>
                      <p className="text-sm tabular-nums text-gray-700 md:col-span-2 md:text-right">
                        <ColumnLabel>Received so far</ColumnLabel>
                        {item.receivedQty} {item.unit}
                      </p>
                      <div className="md:col-span-2">
                        <ColumnLabel>Receive now</ColumnLabel>
                        <QuantityInput
                          aria-label={`Received quantity for ${item.product?.name}`}
                          placeholder="Quantity"
                          value={row.receivedQty}
                          onChange={(event) => updateListed(item.productId, { receivedQty: event.target.value })}
                        />
                      </div>
                      <div className="md:col-span-2">
                        <ColumnLabel>Remarks (optional)</ColumnLabel>
                        <Input
                          aria-label={`Remarks for ${item.product?.name}`}
                          placeholder="e.g. 2 boxes damaged"
                          maxLength={200}
                          value={row.remarks}
                          onChange={(event) => updateListed(item.productId, { remarks: event.target.value })}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {needsManualRows && (
            <>
              {!sellerId && <p className="mb-2 text-sm text-gray-500">Select a seller to choose its products.</p>}

              <div
                aria-hidden="true"
                className="mb-1 hidden gap-3 px-3 text-xs font-medium uppercase tracking-wide text-gray-500 md:grid md:grid-cols-12"
              >
                <span className="col-span-4">Product</span>
                <span className="col-span-2">Quantity received</span>
                <span className="col-span-1">Unit</span>
                <span className="col-span-4">Remarks (optional)</span>
                <span className="col-span-1" />
              </div>

              <div className="space-y-3">
                {manualRows.map((row, index) => {
                  const rowErrors = errors.rows?.[index] ?? {};
                  const product = knownProducts.get(row.productId);

                  return (
                    <div key={row.key} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-12 md:items-start">
                      <div className="md:col-span-4">
                        <ColumnLabel>Product</ColumnLabel>
                        <Select
                          aria-label={`Product for item ${index + 1}`}
                          value={row.productId}
                          onChange={(event) => updateManual(row.key, { productId: event.target.value })}
                          isAsync
                          loadOptions={loadProductOptions}
                          loadParams={{ sellerId, status: "active" }}
                          initialOptions={product ? [productOption(product)] : []}
                          disabledValues={chosenProductIds}
                          isDisabled={!sellerId}
                          error={rowErrors.productId}
                          placeholder="Select a product"
                          noOptionsText="No active products made under this seller"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <ColumnLabel>Quantity received</ColumnLabel>
                        <QuantityInput
                          aria-label={`Received quantity for item ${index + 1}`}
                          placeholder="Quantity"
                          value={row.receivedQty}
                          onChange={(event) => updateManual(row.key, { receivedQty: event.target.value })}
                          error={rowErrors.receivedQty}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <ColumnLabel>Unit</ColumnLabel>
                        <p className="flex h-10 items-center text-sm text-gray-500" title="Unit of measurement">
                          {product?.unit || "—"}
                        </p>
                      </div>
                      <div className="md:col-span-4">
                        <ColumnLabel>Remarks (optional)</ColumnLabel>
                        <Input
                          aria-label={`Remarks for item ${index + 1}`}
                          placeholder="e.g. 2 boxes damaged"
                          maxLength={200}
                          value={row.remarks}
                          onChange={(event) => updateManual(row.key, { remarks: event.target.value })}
                        />
                      </div>
                      <div className="flex justify-end md:col-span-1">
                        <button
                          type="button"
                          onClick={() => removeManual(row.key)}
                          title="Remove item"
                          aria-label={`Remove item ${index + 1}`}
                          className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {(hasOrderItems || needsManualRows) && (
        <div className="flex items-center justify-end gap-3 text-sm">
          <span className="text-gray-500">
            Total received ({itemsReceived} item{itemsReceived === 1 ? "" : "s"})
          </span>
          <span className="text-base font-semibold tabular-nums text-gray-900">{totalReceived}</span>
        </div>
      )}

      <Input
        label="Notes"
        name="notes"
        type="textarea"
        rows={2}
        value={values.notes}
        onChange={handleChange}
        maxLength={500}
        placeholder="Optional"
      />
    </form>
  );
};

export default GrnForm;
