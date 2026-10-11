import { useCallback, useState } from "react";
import { ScanBarcode } from "lucide-react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import { RESTRICTIONS } from "../../../utils/inputRestrictions";
import { DROPDOWN_PAGE_SIZE } from "../../../utils/dropdownLoaders";
import { nowInputDateTime } from "../../../utils/formatDate";
import { getErrorMessage } from "../../../utils/getErrorMessage";
import { getPutawayGrns, getPutawayGrnItems } from "../../../services/putawayService";

export const PUTAWAY_FORM_ID = "putaway-form";

const roundTo3 = (value) => Math.round(value * 1000) / 1000;

const grnOption = (grn) => ({
  value: grn.id,
  label: `${grn.grnNumber} - ${grn.seller?.name ?? ""} (${grn.remainingQty} left)`,
});

const ColumnLabel = ({ children }) => (
  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 md:hidden">{children}</span>
);

// Put goods away: pick an inspected GRN, then enter how much of each item's passed quantity goes into inventory.
// Rendered inside a Modal; the modal footer's submit button targets this form through PUTAWAY_FORM_ID.
// Only the PASSED quantity can be put away (failed goods never enter inventory), and no more than what is left
// of it. A barcode scanner works here too: every scan adds 1 to that item.
const PutawayForm = ({ onSubmit, apiError = "" }) => {
  const [grnId, setGrnId] = useState("");
  const [grn, setGrn] = useState(null); // { grnNumber, seller, supplier, items }
  const [loadingGrn, setLoadingGrn] = useState(false);
  const [quantities, setQuantities] = useState({}); // productId -> text
  const [putawayAt, setPutawayAt] = useState(nowInputDateTime());
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState({});

  const [scanCode, setScanCode] = useState("");
  const [scanMessage, setScanMessage] = useState(null); // { type: "success" | "error", text }

  const loadGrnOptions = useCallback(async ({ search, page }) => {
    const { data, meta } = await getPutawayGrns({ search: search || undefined, page: page + 1, limit: DROPDOWN_PAGE_SIZE });
    return { options: data.map(grnOption), hasMore: Boolean(meta) && meta.current_page < meta.total_page };
  }, []);

  const clearError = (name) => setErrors((previous) => ({ ...previous, [name]: undefined }));

  const handleGrnChange = async (event) => {
    const nextId = event.target.value;

    setGrnId(nextId);
    setGrn(null);
    setQuantities({});
    setScanMessage(null);
    clearError("grnId");
    clearError("items");

    if (!nextId) return;

    try {
      setLoadingGrn(true);

      const { data } = await getPutawayGrnItems(nextId);
      setGrn(data);
      setQuantities(Object.fromEntries(data.items.map((item) => [item.productId, ""])));
    } catch (err) {
      setErrors((previous) => ({ ...previous, grnId: getErrorMessage(err, "Could not load this GRN.") }));
    } finally {
      setLoadingGrn(false);
    }
  };

  const setQuantity = (productId, value) => {
    setQuantities((previous) => ({ ...previous, [productId]: value }));
    clearError("items");
  };

  const fillRemaining = () => {
    setQuantities(Object.fromEntries(grn.items.map((item) => [item.productId, item.remainingQty > 0 ? String(item.remainingQty) : ""])));
    clearError("items");
  };

  const handleScan = (rawCode) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    const item = grn.items.find((candidate) => candidate.product?.barcode?.toUpperCase() === code);
    if (!item) {
      setScanMessage({ type: "error", text: `No item on ${grn.grnNumber} has the barcode ${code}.` });
      return;
    }

    const next = roundTo3((Number(quantities[item.productId]) || 0) + 1);
    setQuantity(item.productId, String(next));
    setScanMessage({ type: "success", text: `${item.product.name}: ${next} ${item.unit}` });
  };

  const handleScanKeyDown = (event) => {
    if (event.key !== "Enter") return;

    // A scanner ends the code with Enter: that must not submit the form.
    event.preventDefault();
    const code = scanCode;
    setScanCode("");
    handleScan(code);
  };

  const entered = grn ? grn.items.map((item) => Number(quantities[item.productId]) || 0) : [];
  const totalQty = roundTo3(entered.reduce((sum, quantity) => sum + quantity, 0));
  const itemsCount = entered.filter((quantity) => quantity > 0).length;

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!grnId) nextErrors.grnId = "Select a GRN";
    if (!putawayAt) nextErrors.putawayAt = "Put away time is required";
    else if (new Date(putawayAt).getTime() > Date.now() + 5 * 60 * 1000) nextErrors.putawayAt = "Cannot be in the future";

    const items = [];

    if (grn) {
      for (const item of grn.items) {
        const quantity = Number(quantities[item.productId]);
        if (!(quantity > 0)) continue;

        if (quantity > item.remainingQty + 1e-9) {
          nextErrors.items = `${item.product.name}: only ${item.remainingQty} ${item.unit} of the passed goods is left to put away.`;
        }
        items.push({ productId: item.productId, quantity });
      }

      if (!nextErrors.items && items.length === 0) nextErrors.items = "Enter the quantity to put away for at least one item";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({ grnId, items, putawayAt: new Date(putawayAt).toISOString(), notes: notes.trim() });
  };

  return (
    <form id={PUTAWAY_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-6">
      {apiError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {apiError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="GRN"
          name="grnId"
          value={grnId}
          onChange={handleGrnChange}
          isAsync
          loadOptions={loadGrnOptions}
          error={errors.grnId}
          isRequired
          placeholder="Select a GRN"
          noOptionsText="No inspected GRNs with goods left to put away"
          helperText="Only inspected GRNs with passed goods that are not yet put away."
        />
        <Input
          label="Put Away At"
          name="putawayAt"
          type="datetime-local"
          value={putawayAt}
          onChange={(event) => {
            setPutawayAt(event.target.value);
            clearError("putawayAt");
          }}
          error={errors.putawayAt}
          isRequired
        />
      </div>

      {loadingGrn && <p className="text-sm text-gray-500">Loading...</p>}

      {grn && (
        <>
          <dl className="grid grid-cols-3 gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">GRN</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{grn.grnNumber}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Seller</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{grn.seller?.name}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-gray-500">Supplier</dt>
              <dd className="mt-0.5 font-medium text-gray-900">{grn.supplier?.name}</dd>
            </div>
          </dl>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-gray-700">
                Items to put away<span className="ml-0.5 text-red-500">*</span>
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={fillRemaining}>
                Fill remaining quantities
              </Button>
            </div>

            {errors.items && (
              <p role="alert" className="mb-2 text-sm text-red-600">
                {errors.items}
              </p>
            )}

            <div className="mb-3">
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Input
                    label="Scan Barcode"
                    value={scanCode}
                    onChange={(event) => setScanCode(event.target.value)}
                    onKeyDown={handleScanKeyDown}
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

            <div
              aria-hidden="true"
              className="mb-1 hidden gap-3 px-3 text-xs font-medium uppercase tracking-wide text-gray-500 md:grid md:grid-cols-12"
            >
              <span className="col-span-4">Product</span>
              <span className="col-span-2 text-right">Passed</span>
              <span className="col-span-2 text-right">Already put away</span>
              <span className="col-span-2 text-right">Left</span>
              <span className="col-span-2">Put away now</span>
            </div>

            <div className="space-y-3">
              {grn.items.map((item) => (
                <div
                  key={item.productId}
                  className={`grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 md:grid-cols-12 md:items-center ${
                    item.remainingQty <= 0 ? "bg-gray-50 opacity-70" : ""
                  }`}
                >
                  <div className="md:col-span-4">
                    <p className="text-sm font-medium text-gray-900">{item.product.name}</p>
                    <p className="text-xs text-gray-500">{item.product.sku}</p>
                  </div>
                  <p className="text-sm tabular-nums text-gray-700 md:col-span-2 md:text-right">
                    <ColumnLabel>Passed</ColumnLabel>
                    {item.passedQty} {item.unit}
                  </p>
                  <p className="text-sm tabular-nums text-gray-700 md:col-span-2 md:text-right">
                    <ColumnLabel>Already put away</ColumnLabel>
                    {item.putawayQty} {item.unit}
                  </p>
                  <p className="text-sm font-medium tabular-nums text-gray-900 md:col-span-2 md:text-right">
                    <ColumnLabel>Left</ColumnLabel>
                    {item.remainingQty} {item.unit}
                  </p>
                  <div className="md:col-span-2">
                    <ColumnLabel>Put away now</ColumnLabel>
                    <Input
                      aria-label={`Quantity to put away for ${item.product.name}`}
                      placeholder="Quantity"
                      inputMode="decimal"
                      restrictions={[{ name: RESTRICTIONS.DECIMAL, upto: 3 }, { name: RESTRICTIONS.MAX_LENGTH, max: 14 }]}
                      value={quantities[item.productId] ?? ""}
                      onChange={(event) => setQuantity(item.productId, event.target.value)}
                      isDisabled={item.remainingQty <= 0}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-end gap-3 text-sm">
              <span className="text-gray-500">
                Total to put away ({itemsCount} item{itemsCount === 1 ? "" : "s"})
              </span>
              <span className="text-base font-semibold tabular-nums text-gray-900">{totalQty}</span>
            </div>
          </div>
        </>
      )}

      <Input
        label="Notes"
        name="notes"
        type="textarea"
        rows={2}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        maxLength={500}
        placeholder="Optional"
      />
    </form>
  );
};

export default PutawayForm;
