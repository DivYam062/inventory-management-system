import { useState } from "react";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Toggle from "../../../components/ui/Toggle";
import { RESTRICTIONS } from "../../../utils/inputRestrictions";

export const SUPPLIER_FORM_ID = "supplier-form";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

// Create / edit form for a supplier. Rendered inside a Modal; the modal footer's submit button targets
// this form through SUPPLIER_FORM_ID.
//   loadSellerOptions   loader for the seller dropdown (active sellers). Used when creating, to assign the
//                       supplier right away; it fetches only when the dropdown is opened, 40 at a time.
// When editing, the seller is shown but not changed here: use Assign / Unassign in the table.
const SupplierForm = ({ supplier, loadSellerOptions, onSubmit, apiError = "" }) => {
  const isEdit = Boolean(supplier);

  const [values, setValues] = useState(() => ({
    name: supplier?.name ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ?? "",
    sellerId: "",
    status: supplier?.status ?? "active",
  }));
  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!values.name.trim()) nextErrors.name = "Supplier name is required";
    if (!values.email.trim()) nextErrors.email = "Supplier email is required";
    else if (!EMAIL_PATTERN.test(values.email.trim())) nextErrors.email = "Enter a valid email address";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      status: values.status,
    };

    if (!isEdit && values.sellerId) payload.sellerId = values.sellerId;

    onSubmit(payload);
  };

  return (
    <form id={SUPPLIER_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-5">
      {apiError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {apiError}
        </div>
      )}

      <Input
        label="Supplier Name"
        name="name"
        value={values.name}
        onChange={handleChange}
        error={errors.name}
        isRequired
        maxLength={100}
        placeholder="Full name"
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Email"
          name="email"
          type="email"
          value={values.email}
          onChange={handleChange}
          error={errors.email}
          isRequired
          placeholder="name@seller.com"
          helperText="Identifies the supplier; the same email cannot be added twice."
        />
        <Input
          label="Phone Number"
          name="phone"
          type="tel"
          restrictions={[{ name: RESTRICTIONS.PHONE }, { name: RESTRICTIONS.MAX_LENGTH, max: 20 }]}
          value={values.phone}
          onChange={handleChange}
          placeholder="Optional"
        />
      </div>

      {isEdit ? (
        <div className="rounded-lg bg-gray-50 px-4 py-3 text-sm">
          <p className="font-medium text-gray-900">Seller</p>
          <p className="mt-0.5 text-gray-600">
            {supplier.seller ? supplier.seller.name : "Not assigned to a seller"}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            A supplier works under one seller at a time. Use Assign / Unassign in the table to change it.
          </p>
        </div>
      ) : (
        <Select
          label="Seller"
          name="sellerId"
          value={values.sellerId}
          onChange={handleChange}
          isAsync
          loadOptions={loadSellerOptions}
          isClearable
          placeholder="Not assigned"
          noOptionsText="No active sellers found"
          helperText="Optional. A supplier works under one seller at a time; it can be assigned later."
        />
      )}

      <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Supplier status</p>
          <p className="mt-0.5 text-sm text-gray-500">
            {values.status === "active"
              ? "Active - available for purchase orders and deliveries."
              : "Inactive - kept on record but not offered when choosing a supplier."}
          </p>
        </div>

        <Toggle
          label={values.status === "active" ? "Active" : "Inactive"}
          name="status"
          isChecked={values.status === "active"}
          onChange={(event) =>
            handleChange({ target: { name: "status", value: event.target.checked ? "active" : "inactive" } })
          }
          className="shrink-0"
        />
      </div>
    </form>
  );
};

export default SupplierForm;
