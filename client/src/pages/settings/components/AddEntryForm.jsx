import { useState } from "react";
import Input from "../../../components/ui/Input";

export const ADD_ENTRY_FORM_ID = "add-entry-form";

const CODE_PATTERN = /^[A-Z0-9][A-Z0-9_-]{0,9}$/;

// Add a custom currency (code, name, symbol) or unit of measurement (code, name). Rendered inside a Modal;
// the modal footer's submit button targets this form through ADD_ENTRY_FORM_ID.
//   kind: "currency" | "unit"
const AddEntryForm = ({ kind, onSubmit, apiError = "" }) => {
  const isCurrency = kind === "currency";
  const label = isCurrency ? "Currency" : "Unit";

  const [values, setValues] = useState({ code: "", name: "", symbol: "" });
  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: name === "code" ? value.toUpperCase() : value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!values.code.trim()) nextErrors.code = `${label} code is required`;
    else if (!CODE_PATTERN.test(values.code.trim())) {
      nextErrors.code = "Use 1-10 letters or numbers (A-Z, 0-9, - or _)";
    }
    if (!values.name.trim()) nextErrors.name = `${label} name is required`;

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = { code: values.code.trim(), name: values.name.trim() };
    if (isCurrency && values.symbol.trim()) payload.symbol = values.symbol.trim();

    onSubmit(payload);
  };

  return (
    <form id={ADD_ENTRY_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-5">
      {apiError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {apiError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label={`${label} Code`}
          name="code"
          value={values.code}
          onChange={handleChange}
          error={errors.code}
          isRequired
          maxLength={10}
          placeholder={isCurrency ? "e.g. PTS" : "e.g. CRATE"}
          helperText="Short and unique. This is what is saved on records."
        />
        <Input
          label={`${label} Name`}
          name="name"
          value={values.name}
          onChange={handleChange}
          error={errors.name}
          isRequired
          maxLength={50}
          placeholder={isCurrency ? "e.g. Reward Points" : "e.g. Crate"}
        />
      </div>

      {isCurrency && (
        <Input
          label="Symbol"
          name="symbol"
          value={values.symbol}
          onChange={handleChange}
          maxLength={5}
          placeholder="Optional, e.g. pt"
        />
      )}
    </form>
  );
};

export default AddEntryForm;
