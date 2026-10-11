import { useState } from "react";
import Input from "../../../components/ui/Input";
import Toggle from "../../../components/ui/Toggle";
import { RESTRICTIONS } from "../../../utils/inputRestrictions";

export const SELLER_FORM_ID = "seller-form";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

const SellerForm = ({ seller, onSubmit, apiError = "" }) => {
  const [values, setValues] = useState(() => ({
    name: seller?.name ?? "",
    email: seller?.email ?? "",
    phone: seller?.phone ?? "",
    address: seller?.address ?? "",
    status: seller?.status ?? "active",
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
    if (!values.name.trim()) nextErrors.name = "Seller name is required";
    if (!values.email.trim()) nextErrors.email = "Seller email is required";
    else if (!EMAIL_PATTERN.test(values.email.trim())) nextErrors.email = "Enter a valid email address";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      address: values.address.trim(),
      status: values.status,
    });
  };

  return (
    <form id={SELLER_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-5">
      {apiError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {apiError}
        </div>
      )}

      <Input
        label="Seller Name"
        name="name"
        value={values.name}
        onChange={handleChange}
        error={errors.name}
        isRequired
        maxLength={100}
        placeholder="e.g. Fresh Farms Pvt Ltd"
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
          placeholder="sales@seller.com"
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

      <Input
        label="Address"
        name="address"
        type="textarea"
        rows={3}
        value={values.address}
        onChange={handleChange}
        maxLength={300}
        placeholder="Optional"
      />

      <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Seller status</p>
          <p className="mt-0.5 text-sm text-gray-500">
            {values.status === "active"
              ? "Active - available when creating products and purchase orders."
              : "Inactive - kept on record but not offered when choosing a seller."}
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

export default SellerForm;
