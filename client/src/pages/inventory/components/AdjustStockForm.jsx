import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import Input from "../../../components/ui/Input";
import { RESTRICTIONS } from "../../../utils/inputRestrictions";

export const ADJUST_STOCK_FORM_ID = "adjust-stock-form";

const roundTo3 = (value) => Math.round(value * 1000) / 1000;

const TYPES = [
  { value: "increase", label: "Increase", icon: Plus, active: "border-green-500 bg-green-50 text-green-700" },
  { value: "decrease", label: "Decrease", icon: Minus, active: "border-red-500 bg-red-50 text-red-700" },
];

// Increase or decrease one product's stock by hand. Rendered inside a Modal; the modal footer's submit button
// targets this form through ADJUST_STOCK_FORM_ID. A reason is required (it is kept in the history) and a
// decrease cannot take more than is in stock; the result is shown as you type.
const AdjustStockForm = ({ row, initialType = "increase", onSubmit, apiError = "" }) => {
  const [type, setType] = useState(initialType);
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState({});

  const unit = row.product.unit;
  const amount = Number(quantity) || 0;
  const result = roundTo3(type === "increase" ? row.quantity + amount : row.quantity - amount);

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {};

    if (!(amount > 0)) nextErrors.quantity = "Enter a quantity greater than 0";
    else if (type === "decrease" && amount > row.quantity + 1e-9) {
      nextErrors.quantity = `Only ${row.quantity} ${unit} in stock`;
    }
    if (!reason.trim()) nextErrors.reason = "A reason is required";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({ type, quantity: amount, reason: reason.trim() });
  };

  return (
    <form id={ADJUST_STOCK_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-5">
      {apiError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {apiError}
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-sm font-medium text-gray-900">{row.product.name}</p>
        <p className="text-xs text-gray-500">{row.product.sku}</p>
        <p className="mt-2 text-sm text-gray-600">
          In stock: <span className="font-semibold tabular-nums text-gray-900">{row.quantity}</span> {unit}
        </p>
      </div>

      <fieldset>
        <legend className="mb-1 block text-sm font-medium text-gray-700">Adjustment</legend>
        <div className="grid grid-cols-2 gap-3">
          {TYPES.map(({ value, label, icon: Icon, active }) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium transition ${
                type === value ? active : "border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={value}
                checked={type === value}
                onChange={() => {
                  setType(value);
                  setErrors({});
                }}
                className="sr-only"
              />
              <Icon size={16} aria-hidden="true" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <Input
        label={`Quantity (${unit})`}
        name="quantity"
        inputMode="decimal"
        restrictions={[{ name: RESTRICTIONS.DECIMAL, upto: 3 }, { name: RESTRICTIONS.MAX_LENGTH, max: 14 }]}
        value={quantity}
        onChange={(event) => {
          setQuantity(event.target.value);
          setErrors((previous) => ({ ...previous, quantity: undefined }));
        }}
        error={errors.quantity}
        isRequired
        placeholder={type === "increase" ? "How many to add" : "How many to take out"}
      />

      <Input
        label="Reason"
        name="reason"
        value={reason}
        onChange={(event) => {
          setReason(event.target.value);
          setErrors((previous) => ({ ...previous, reason: undefined }));
        }}
        error={errors.reason}
        isRequired
        maxLength={200}
        placeholder={type === "increase" ? "e.g. Found in the back room" : "e.g. Damaged, expired, sample"}
        helperText="Kept in the stock history."
      />

      <div className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-sm">
        <span className="text-gray-500">Stock after this change</span>
        <span className={`text-base font-semibold tabular-nums ${result < 0 ? "text-red-600" : "text-gray-900"}`}>
          {result} {unit}
        </span>
      </div>
    </form>
  );
};

export default AdjustStockForm;
