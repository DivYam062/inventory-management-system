import { useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { Plus, Trash2 } from "lucide-react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Toggle from "../../../components/ui/Toggle";
import { RESTRICTIONS } from "../../../utils/inputRestrictions";
import { DROPDOWN_PAGE_SIZE } from "../../../utils/dropdownLoaders";
import { formatCurrency } from "../../../utils/currency";
import { todayInputValue, toInputDate } from "../../../utils/formatDate";
import { getProducts } from "../../../services/productService";

export const PURCHASE_ORDER_FORM_ID = "purchase-order-form";

let rowCounter = 0;
const blankRow = () => ({ key: `row-${(rowCounter += 1)}`, productId: "", quantity: "", unitPrice: "" });

const productOption = (product) => ({ value: product.id, label: `${product.name} (${product.sku})` });

// A column caption: shown as a header above the rows on wide screens, and above each field on narrow ones
// (where the rows stack and there is no header).
const ColumnLabel = ({ children }) => (
  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 md:hidden">{children}</span>
);

const lineTotal = (row) => (Number(row.quantity) || 0) * (Number(row.unitPrice) || 0);

// Create / edit form for a purchase order. Rendered inside a Modal; the modal footer's submit button targets
// this form through PURCHASE_ORDER_FORM_ID.
//
// Order of choices: Seller -> Supplier (only active suppliers working under that seller) -> items (only
// active products made under that seller). Changing the seller clears the supplier and the items. The
// dropdowns load from the API when opened, 40 at a time.
const PurchaseOrderForm = ({
  order,
  loadSellerOptions,
  loadSupplierOptions,
  loadCurrencyOptions,
  onSubmit,
  apiError = "",
}) => {
  // Organization setting (Configuration): only while it is on does an order get its own over-receiving choice.
  const canChooseOverReceiving = useSelector((state) => state.auth.purchaseOrder?.allowOverReceiving);

  const [values, setValues] = useState(() => ({
    sellerId: order?.seller?.id ?? "",
    supplierId: order?.supplier?.id ?? "",
    currency: order?.currency ?? "",
    orderDate: order ? toInputDate(order.orderDate) : todayInputValue(),
    expectedDate: order ? toInputDate(order.expectedDate) : "",
    notes: order?.notes ?? "",
    allowOverReceiving: order?.allowOverReceiving ?? false,
  }));

  const [rows, setRows] = useState(() =>
    order
      ? order.items.map((item) => ({
          key: `row-${(rowCounter += 1)}`,
          productId: item.product?.id ?? "",
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
        }))
      : [blankRow()]
  );

  const [errors, setErrors] = useState({});

  // Products seen so far (from the dropdown, or the saved order), by id: gives the unit and the default price
  // when one is picked.
  const [knownProducts, setKnownProducts] = useState(
    () =>
      new Map(
        (order?.items ?? [])
          .filter((item) => item.product)
          .map((item) => [item.product.id, { ...item.product, unit: item.unit }])
      )
  );

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

  const handleSellerChange = (event) => {
    const sellerId = event.target.value;
    if (sellerId === values.sellerId) return;

    setValues((previous) => ({ ...previous, sellerId, supplierId: "" }));
    setRows([blankRow()]);
    setErrors({});
  };

  const updateRow = (key, changes) => {
    setRows((previous) => previous.map((row) => (row.key === key ? { ...row, ...changes } : row)));
    setErrors((previous) => ({ ...previous, items: undefined }));
  };

  const handleProductChange = (key, productId) => {
    const product = knownProducts.get(productId);
    const changes = { productId };

    if (product) {
      // The first product's currency becomes the order's currency when none is chosen yet.
      const currency = values.currency || product.currency || "";
      if (!values.currency && product.currency) setValues((previous) => ({ ...previous, currency: product.currency }));

      if (product.price !== undefined && product.price !== null && product.currency === currency) {
        changes.unitPrice = String(product.price);
      }
    }

    updateRow(key, changes);
  };

  const removeRow = (key) => setRows((previous) => (previous.length === 1 ? [blankRow()] : previous.filter((row) => row.key !== key)));

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!values.sellerId) nextErrors.sellerId = "Select a seller";
    if (!values.supplierId) nextErrors.supplierId = "Select a supplier";
    if (!values.currency) nextErrors.currency = "Select a currency";
    if (!values.orderDate) nextErrors.orderDate = "Order date is required";
    if (values.expectedDate && values.orderDate && values.expectedDate < values.orderDate) {
      nextErrors.expectedDate = "Cannot be before the order date";
    }

    const seen = new Set();
    const itemErrors = rows.map((row) => {
      const rowErrors = {};
      if (!row.productId) rowErrors.productId = "Select a product";
      else if (seen.has(row.productId)) rowErrors.productId = "Already on the order";
      else seen.add(row.productId);

      if (!(Number(row.quantity) > 0)) rowErrors.quantity = "Enter a quantity";
      if (row.unitPrice === "" || Number.isNaN(Number(row.unitPrice))) rowErrors.unitPrice = "Enter a price";
      return rowErrors;
    });
    if (itemErrors.some((rowErrors) => Object.keys(rowErrors).length > 0)) nextErrors.items = itemErrors;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      // Sent only while the organization allows over-receiving; otherwise the order simply has none.
      ...(canChooseOverReceiving && { allowOverReceiving: values.allowOverReceiving }),
      sellerId: values.sellerId,
      supplierId: values.supplierId,
      currency: values.currency,
      orderDate: values.orderDate,
      expectedDate: values.expectedDate,
      notes: values.notes.trim(),
      items: rows.map((row) => ({
        productId: row.productId,
        quantity: Number(row.quantity),
        unitPrice: Number(row.unitPrice),
      })),
    });
  };

  const chosenProductIds = rows.map((row) => row.productId).filter(Boolean);

  const total = rows.reduce((sum, row) => sum + lineTotal(row), 0);
  const formatMoney = (amount) => formatCurrency(amount, values.currency || "INR");

  const initialSellerOptions = order?.seller ? [{ value: order.seller.id, label: order.seller.name }] : [];
  const initialSupplierOptions = order?.supplier ? [{ value: order.supplier.id, label: order.supplier.name }] : [];
  const initialCurrencyOptions = order?.currency ? [{ value: order.currency, label: order.currency }] : [];

  return (
    <form id={PURCHASE_ORDER_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-6">
      {apiError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {apiError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="Seller"
          name="sellerId"
          value={values.sellerId}
          onChange={handleSellerChange}
          isAsync
          loadOptions={loadSellerOptions}
          initialOptions={initialSellerOptions}
          error={errors.sellerId}
          isRequired
          placeholder="Select a seller"
          noOptionsText="No active sellers found"
          helperText="Changing the seller clears the supplier and the items."
        />
        <Select
          label="Supplier"
          name="supplierId"
          value={values.supplierId}
          onChange={handleChange}
          isAsync
          loadOptions={loadSupplierOptions}
          loadParams={{ sellerId: values.sellerId, status: "active" }}
          initialOptions={initialSupplierOptions}
          isDisabled={!values.sellerId}
          error={errors.supplierId}
          isRequired
          placeholder={values.sellerId ? "Select a supplier" : "Select a seller first"}
          noOptionsText="No active suppliers work under this seller"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <Input
          label="Order Date"
          name="orderDate"
          type="date"
          value={values.orderDate}
          onChange={handleChange}
          error={errors.orderDate}
          isRequired
        />
        <Input
          label="Expected Date"
          name="expectedDate"
          type="date"
          value={values.expectedDate}
          onChange={handleChange}
          error={errors.expectedDate}
          min={values.orderDate || undefined}
        />
        <Select
          label="Currency"
          name="currency"
          value={values.currency}
          onChange={handleChange}
          isAsync
          loadOptions={loadCurrencyOptions}
          initialOptions={initialCurrencyOptions}
          error={errors.currency}
          isRequired
          placeholder="Select a currency"
          noOptionsText="No currencies found"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm font-medium text-gray-700">
            Items<span className="ml-0.5 text-red-500">*</span>
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={Plus}
            onClick={() => setRows((previous) => [...previous, blankRow()])}
            disabled={!values.sellerId}
          >
            Add Item
          </Button>
        </div>

        {!values.sellerId && <p className="mb-2 text-sm text-gray-500">Select a seller to choose its products.</p>}

        <div
          aria-hidden="true"
          className="mb-1 hidden gap-3 px-3 text-xs font-medium uppercase tracking-wide text-gray-500 md:grid md:grid-cols-12"
        >
          <span className="col-span-5">Product</span>
          <span className="col-span-2">Quantity</span>
          <span className="col-span-1">Unit</span>
          <span className="col-span-2">Price per unit{values.currency ? ` (${values.currency})` : ""}</span>
          <span className="col-span-1 text-right">Total</span>
          <span className="col-span-1" />
        </div>

        <div className="space-y-3">
          {rows.map((row, index) => {
            const rowErrors = errors.items?.[index] ?? {};
            const product = knownProducts.get(row.productId);
            const initialProduct = product ? [productOption(product)] : [];

            return (
              <div key={row.key} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-12 md:items-start">
                <div className="md:col-span-5">
                  <ColumnLabel>Product</ColumnLabel>
                  <Select
                    aria-label={`Product for item ${index + 1}`}
                    value={row.productId}
                    onChange={(event) => handleProductChange(row.key, event.target.value)}
                    isAsync
                    loadOptions={loadProductOptions}
                    loadParams={{ sellerId: values.sellerId, status: "active" }}
                    initialOptions={initialProduct}
                    disabledValues={chosenProductIds}
                    isDisabled={!values.sellerId}
                    error={rowErrors.productId}
                    placeholder="Select a product"
                    noOptionsText="No active products made under this seller"
                  />
                </div>

                <div className="md:col-span-2">
                  <ColumnLabel>Quantity</ColumnLabel>
                  <Input
                    aria-label={`Quantity for item ${index + 1}`}
                    placeholder="Quantity"
                    inputMode="decimal"
                    restrictions={[{ name: RESTRICTIONS.DECIMAL, upto: 3 }, { name: RESTRICTIONS.MAX_LENGTH, max: 14 }]}
                    value={row.quantity}
                    onChange={(event) => updateRow(row.key, { quantity: event.target.value })}
                    error={rowErrors.quantity}
                  />
                </div>

                <div className="md:col-span-1">
                  <ColumnLabel>Unit</ColumnLabel>
                  <p className="flex h-10 items-center text-sm text-gray-500" title="Unit of measurement">
                    {product?.unit || "—"}
                  </p>
                </div>

                <div className="md:col-span-2">
                  <ColumnLabel>Price per unit{values.currency ? ` (${values.currency})` : ""}</ColumnLabel>
                  <Input
                    aria-label={`Price per unit for item ${index + 1}`}
                    title="Price of one unit of this product"
                    placeholder="Per unit"
                    inputMode="decimal"
                    restrictions={[{ name: RESTRICTIONS.DECIMAL, upto: 2 }, { name: RESTRICTIONS.MAX_LENGTH, max: 12 }]}
                    value={row.unitPrice}
                    onChange={(event) => updateRow(row.key, { unitPrice: event.target.value })}
                    error={rowErrors.unitPrice}
                  />
                </div>

                <div className="md:col-span-1">
                  <ColumnLabel>Total</ColumnLabel>
                  <p className="flex h-10 items-center justify-end text-sm font-medium tabular-nums text-gray-900">
                    {formatMoney(lineTotal(row))}
                  </p>
                </div>

                <div className="flex justify-end md:col-span-1">
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
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

        <div className="mt-3 flex items-center justify-end gap-3 text-sm">
          <span className="text-gray-500">Total</span>
          <span className="text-base font-semibold tabular-nums text-gray-900">{formatMoney(total)}</span>
        </div>
      </div>

      {canChooseOverReceiving && (
        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">Allow over-receiving</p>
            <p className="mt-0.5 text-sm text-gray-500">
              {values.allowOverReceiving
                ? "On - more of an item than ordered can be received against this order."
                : "Off - only the ordered quantity of each item can be received against this order."}
            </p>
          </div>

          <Toggle
            label={values.allowOverReceiving ? "Allowed" : "Not allowed"}
            name="allowOverReceiving"
            isChecked={values.allowOverReceiving}
            onChange={(event) => setValues((previous) => ({ ...previous, allowOverReceiving: event.target.checked }))}
            className="shrink-0"
          />
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

export default PurchaseOrderForm;
