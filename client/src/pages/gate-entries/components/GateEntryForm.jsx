import { useCallback, useRef, useState } from "react";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import TabToggle from "../../../components/ui/TabToggle";
import { RESTRICTIONS } from "../../../utils/inputRestrictions";
import { DROPDOWN_PAGE_SIZE } from "../../../utils/dropdownLoaders";
import { nowInputDateTime, toInputDateTime } from "../../../utils/formatDate";
import { getPurchaseOrders } from "../../../services/purchaseOrderService";

export const GATE_ENTRY_FORM_ID = "gate-entry-form";

const VEHICLE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 -]*$/;

const SOURCES = [
  { value: "purchase_order", label: "Purchase Order" },
  { value: "direct", label: "Seller & Supplier" },
];

const orderOption = (order) => ({ value: order.id, label: `${order.poNumber} - ${order.seller?.name ?? ""}` });

// Create / edit form for a gate entry. Rendered inside a Modal; the modal footer's submit button targets this
// form through GATE_ENTRY_FORM_ID.
//
// Two ways to record an arrival:
//   - against an issued purchase order (only when the Purchase Order module is on): the seller comes from the
//     order and the supplier is the order's, unless another supplier of that seller delivers;
//   - directly: choose the seller, then one of its suppliers.
// When editing, the source, purchase order and seller are fixed and only the supplier and the delivery
// details can change.
const GateEntryForm = ({
  entry,
  canUsePurchaseOrder,
  loadSellerOptions,
  loadSupplierOptions,
  onSubmit,
  apiError = "",
}) => {
  const isEditing = Boolean(entry);

  const [values, setValues] = useState(() => ({
    source: entry?.source ?? (canUsePurchaseOrder ? "purchase_order" : "direct"),
    purchaseOrderId: entry?.purchaseOrder?.id ?? "",
    sellerId: entry?.seller?.id ?? "",
    supplierId: entry?.supplier?.id ?? "",
    arrivalAt: entry ? toInputDateTime(entry.arrivalAt) : nowInputDateTime(),
    vehicleNumber: entry?.vehicleNumber ?? "",
    packages: entry?.packages ? String(entry.packages) : "",
    driverName: entry?.driverName ?? "",
    driverPhone: entry?.driverPhone ?? "",
    challanNumber: entry?.challanNumber ?? "",
    notes: entry?.notes ?? "",
  }));
  const [errors, setErrors] = useState({});

  // The chosen purchase order (its seller and supplier fill the form), and the names behind the ids.
  const [order, setOrder] = useState(null);
  const [knownOrders, setKnownOrders] = useState(() => new Map());
  const [supplierOption, setSupplierOption] = useState(
    entry?.supplier ? { value: entry.supplier.id, label: entry.supplier.name } : null
  );
  const [sellerName, setSellerName] = useState(entry?.seller?.name ?? "");

  const loadOrderOptions = useCallback(async ({ search, page }) => {
    const { data, meta } = await getPurchaseOrders({
      status: "issued,partially_received",
      search: search || undefined,
      page: page + 1,
      limit: DROPDOWN_PAGE_SIZE,
    });

    setKnownOrders((previous) => {
      const next = new Map(previous);
      data.forEach((item) => next.set(item.id, item));
      return next;
    });

    return { options: data.map(orderOption), hasMore: Boolean(meta) && meta.current_page < meta.total_page };
  }, []);

  // The supplier dropdown clears itself whenever the seller it depends on changes. Picking a purchase order
  // changes the seller and fills in the supplier at the same moment, so that one automatic clear is skipped.
  const skipSupplierClear = useRef(false);

  const clearError = (name) => setErrors((previous) => ({ ...previous, [name]: undefined }));

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    clearError(name);
  };

  const handleSourceChange = (source) => {
    if (source === values.source) return;

    setValues((previous) => ({ ...previous, source, purchaseOrderId: "", sellerId: "", supplierId: "" }));
    setOrder(null);
    setSupplierOption(null);
    setSellerName("");
    setErrors({});
  };

  const handleOrderChange = (event) => {
    const purchaseOrderId = event.target.value;
    const chosen = knownOrders.get(purchaseOrderId) ?? null;

    skipSupplierClear.current = Boolean(chosen?.supplier) && (chosen.seller?.id ?? "") !== values.sellerId;

    setOrder(chosen);
    setValues((previous) => ({
      ...previous,
      purchaseOrderId,
      sellerId: chosen?.seller?.id ?? "",
      supplierId: chosen?.supplier?.id ?? "",
    }));
    setSupplierOption(chosen?.supplier ? { value: chosen.supplier.id, label: chosen.supplier.name } : null);
    setSellerName(chosen?.seller?.name ?? "");
    clearError("purchaseOrderId");
    clearError("supplierId");
  };

  const handleSupplierChange = (event) => {
    if (event.target.value === "" && skipSupplierClear.current) {
      skipSupplierClear.current = false;
      return;
    }

    handleChange(event);
  };

  // A different seller starts the supplier again.
  const handleSellerChange = (event) => {
    const sellerId = event.target.value;
    if (sellerId === values.sellerId) return;

    setValues((previous) => ({ ...previous, sellerId, supplierId: "" }));
    setSupplierOption(null);
    clearError("sellerId");
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!isEditing) {
      if (values.source === "purchase_order" && !values.purchaseOrderId) nextErrors.purchaseOrderId = "Select a purchase order";
      if (values.source === "direct" && !values.sellerId) nextErrors.sellerId = "Select a seller";
    }
    if (!values.supplierId) nextErrors.supplierId = "Select a supplier";

    if (!values.arrivalAt) nextErrors.arrivalAt = "Arrival time is required";
    else if (new Date(values.arrivalAt).getTime() > Date.now() + 5 * 60 * 1000) nextErrors.arrivalAt = "Cannot be in the future";

    if (values.vehicleNumber.trim() && !VEHICLE_PATTERN.test(values.vehicleNumber.trim())) {
      nextErrors.vehicleNumber = "Use letters, numbers, spaces and -";
    }
    if (values.packages.trim() && !(Number.isInteger(Number(values.packages)) && Number(values.packages) >= 1)) {
      nextErrors.packages = "Enter a whole number of 1 or more";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const details = {
      supplierId: values.supplierId,
      arrivalAt: new Date(values.arrivalAt).toISOString(),
      vehicleNumber: values.vehicleNumber.trim(),
      packages: values.packages.trim() ? Number(values.packages) : "",
      driverName: values.driverName.trim(),
      driverPhone: values.driverPhone.trim(),
      challanNumber: values.challanNumber.trim(),
      notes: values.notes.trim(),
    };

    if (isEditing) {
      onSubmit(details);
    } else if (values.source === "purchase_order") {
      onSubmit({ source: "purchase_order", purchaseOrderId: values.purchaseOrderId, ...details });
    } else {
      onSubmit({ source: "direct", sellerId: values.sellerId, ...details });
    }
  };

  const hasSeller = Boolean(values.sellerId);
  const initialSupplierOptions = supplierOption ? [supplierOption] : [];

  return (
    <form id={GATE_ENTRY_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-6">
      {apiError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {apiError}
        </div>
      )}

      {isEditing ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
          <p className="text-gray-500">
            {entry.source === "purchase_order" ? "Against purchase order" : "Directly from seller"}
          </p>
          <p className="mt-0.5 font-medium text-gray-900">
            {entry.purchaseOrder ? `${entry.purchaseOrder.poNumber} - ` : ""}
            {entry.seller?.name}
          </p>
          <p className="mt-1 text-xs text-gray-500">The source, purchase order and seller cannot be changed. Cancel this entry and create a new one instead.</p>
        </div>
      ) : (
        <>
          {canUsePurchaseOrder && (
            <TabToggle
              label="Goods arrive against"
              name="source"
              options={SOURCES}
              value={values.source}
              onChange={(event) => handleSourceChange(event.target.value)}
            />
          )}

          {values.source === "purchase_order" ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Select
                label="Purchase Order"
                name="purchaseOrderId"
                value={values.purchaseOrderId}
                onChange={handleOrderChange}
                isAsync
                loadOptions={loadOrderOptions}
                error={errors.purchaseOrderId}
                isRequired
                placeholder="Select a purchase order"
                noOptionsText="No issued purchase orders found"
                helperText="Only issued purchase orders can have a gate entry."
              />
              <div>
                <p className="mb-1 block text-sm font-medium text-gray-700">Seller</p>
                <p className="flex h-10 items-center rounded-lg border border-gray-200 bg-gray-50 px-3 text-sm text-gray-700">
                  {sellerName || (order ? order.seller?.name : "From the purchase order")}
                </p>
              </div>
            </div>
          ) : (
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
          )}
        </>
      )}

      <Select
        label="Supplier"
        name="supplierId"
        value={values.supplierId}
        onChange={handleSupplierChange}
        isAsync
        loadOptions={loadSupplierOptions}
        loadParams={{ sellerId: values.sellerId, status: "active" }}
        initialOptions={initialSupplierOptions}
        isDisabled={!hasSeller}
        error={errors.supplierId}
        isRequired
        placeholder={hasSeller ? "Select a supplier" : values.source === "purchase_order" ? "Select a purchase order first" : "Select a seller first"}
        noOptionsText="No active suppliers work under this seller"
        helperText={
          !isEditing && values.source === "purchase_order" && hasSeller ? "Defaults to the purchase order's supplier." : undefined
        }
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Arrival Time"
          name="arrivalAt"
          type="datetime-local"
          value={values.arrivalAt}
          onChange={handleChange}
          error={errors.arrivalAt}
          isRequired
        />
        <Input
          label="Vehicle Number"
          name="vehicleNumber"
          value={values.vehicleNumber}
          onChange={handleChange}
          error={errors.vehicleNumber}
          maxLength={20}
          placeholder="Optional, e.g. MH12 AB 1234"
        />
        <Input
          label="Packages"
          name="packages"
          inputMode="numeric"
          restrictions={[{ name: RESTRICTIONS.ONLY_NUMBERS }, { name: RESTRICTIONS.MAX_LENGTH, max: 7 }]}
          value={values.packages}
          onChange={handleChange}
          error={errors.packages}
          placeholder="Optional"
          helperText="Boxes, cartons, ... that arrived."
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Driver Name"
          name="driverName"
          value={values.driverName}
          onChange={handleChange}
          maxLength={100}
          placeholder="Optional"
        />
        <Input
          label="Driver Phone"
          name="driverPhone"
          type="tel"
          restrictions={[{ name: RESTRICTIONS.PHONE }, { name: RESTRICTIONS.MAX_LENGTH, max: 20 }]}
          value={values.driverPhone}
          onChange={handleChange}
          placeholder="Optional"
        />
        <Input
          label="Challan / Invoice No."
          name="challanNumber"
          value={values.challanNumber}
          onChange={handleChange}
          maxLength={50}
          placeholder="Optional"
          helperText="The supplier's delivery document number."
        />
      </div>

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

export default GateEntryForm;
