import { useState } from "react";
import { CheckCheck } from "lucide-react";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import { RESTRICTIONS } from "../../../utils/inputRestrictions";

export const GRN_INSPECT_FORM_ID = "grn-inspect-form";

const roundTo3 = (value) => Math.round(value * 1000) / 1000;

const QuantityInput = (props) => (
  <Input
    inputMode="decimal"
    restrictions={[{ name: RESTRICTIONS.DECIMAL, upto: 3 }, { name: RESTRICTIONS.MAX_LENGTH, max: 14 }]}
    {...props}
  />
);

// Inspection: for every item, how much of what was received passed and how much failed (together they must
// equal the received quantity). Typing one fills the other. Only the passed quantity can later be put away
// into inventory; the failed quantity is given back to the purchase order.
const GrnInspectForm = ({ grn, onSubmit, apiError = "" }) => {
  const [rows, setRows] = useState(() =>
    Object.fromEntries(grn.items.map((item) => [item.id, { passed: String(item.receivedQty), failed: "0", remarks: item.remarks ?? "" }]))
  );
  const [errors, setErrors] = useState({});

  // Whichever of passed / failed is typed, the other becomes the remainder of what was received.
  const setSplit = (item, field, raw) => {
    const typed = Number(raw);
    const other = field === "passed" ? "failed" : "passed";
    const remainder = raw === "" || Number.isNaN(typed) ? "" : String(Math.max(roundTo3(item.receivedQty - typed), 0));

    setRows((previous) => ({ ...previous, [item.id]: { ...previous[item.id], [field]: raw, [other]: remainder } }));
    setErrors((previous) => ({ ...previous, [item.id]: undefined }));
  };

  const markAllPassed = () => {
    setRows((previous) =>
      Object.fromEntries(
        grn.items.map((item) => [item.id, { ...previous[item.id], passed: String(item.receivedQty), failed: "0" }])
      )
    );
    setErrors({});
  };

  // Running totals of what has been entered.
  const sum = (field) => roundTo3(grn.items.reduce((total, item) => total + (Number(rows[item.id]?.[field]) || 0), 0));
  const totalReceived = roundTo3(grn.items.reduce((total, item) => total + item.receivedQty, 0));
  const totalPassed = sum("passed");
  const totalFailed = sum("failed");

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {};
    grn.items.forEach((item) => {
      const row = rows[item.id];
      const passed = Number(row.passed);
      const failed = Number(row.failed);

      if (row.passed === "" || row.failed === "" || Number.isNaN(passed) || Number.isNaN(failed) || passed < 0 || failed < 0) {
        nextErrors[item.id] = "Enter the passed and failed quantity";
      } else if (Math.abs(roundTo3(passed + failed) - item.receivedQty) > 1e-9) {
        nextErrors[item.id] = `Passed + failed must equal ${item.receivedQty}`;
      }
    });

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      items: grn.items.map((item) => ({
        productId: item.product.id,
        passedQty: Number(rows[item.id].passed),
        failedQty: Number(rows[item.id].failed),
        remarks: rows[item.id].remarks.trim(),
      })),
    });
  };

  return (
    <form id={GRN_INSPECT_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-5">
      {apiError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {apiError}
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          Record what passed and what failed for each item. Only the passed quantity can be put away into inventory.
        </p>
        <Button type="button" variant="outline" size="sm" icon={CheckCheck} onClick={markAllPassed}>
          All Passed
        </Button>
      </div>

      <div
        aria-hidden="true"
        className="hidden gap-3 px-3 text-xs font-medium uppercase tracking-wide text-gray-500 md:grid md:grid-cols-12"
      >
        <span className="col-span-4">Product</span>
        <span className="col-span-2 text-right">Received</span>
        <span className="col-span-2">Passed</span>
        <span className="col-span-2">Failed</span>
        <span className="col-span-2">Remarks</span>
      </div>

      <div className="space-y-3">
        {grn.items.map((item) => {
          const row = rows[item.id];
          const name = item.product?.name ?? "item";

          return (
            <div key={item.id} className="rounded-lg border border-gray-200 p-3">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-center">
                <div className="md:col-span-4">
                  <p className="text-sm font-medium text-gray-900">{item.product?.name ?? "—"}</p>
                  <p className="text-xs text-gray-500">{item.product?.sku}</p>
                </div>
                <p className="text-sm tabular-nums text-gray-700 md:col-span-2 md:text-right">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 md:hidden">Received</span>
                  {item.receivedQty} {item.unit}
                </p>
                <div className="md:col-span-2">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 md:hidden">Passed</span>
                  <QuantityInput
                    aria-label={`Passed quantity for ${name}`}
                    value={row.passed}
                    onChange={(event) => setSplit(item, "passed", event.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 md:hidden">Failed</span>
                  <QuantityInput
                    aria-label={`Failed quantity for ${name}`}
                    value={row.failed}
                    onChange={(event) => setSplit(item, "failed", event.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-gray-500 md:hidden">Remarks</span>
                  <Input
                    aria-label={`Remarks for ${name}`}
                    placeholder="e.g. damaged"
                    maxLength={200}
                    value={row.remarks}
                    onChange={(event) => setRows((previous) => ({ ...previous, [item.id]: { ...previous[item.id], remarks: event.target.value } }))}
                  />
                </div>
              </div>

              {errors[item.id] && (
                <p role="alert" className="mt-2 text-sm text-red-600">
                  {errors[item.id]}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total received</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-gray-900">{totalReceived}</p>
        </div>
        <div className="rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total passed</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-green-700">{totalPassed}</p>
        </div>
        <div className="rounded-lg border border-gray-200 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Total failed</p>
          <p className={`mt-1 text-xl font-semibold tabular-nums ${totalFailed > 0 ? "text-red-600" : "text-gray-900"}`}>
            {totalFailed}
          </p>
        </div>
      </div>
    </form>
  );
};

export default GrnInspectForm;
