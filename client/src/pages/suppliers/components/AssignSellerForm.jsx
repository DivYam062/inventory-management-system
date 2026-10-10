import { useState } from "react";
import Select from "../../../components/ui/Select";

export const ASSIGN_FORM_ID = "assign-seller-form";

// Choose the seller an unassigned supplier will work under. Rendered inside a Modal; the modal footer's
// submit button targets this form through ASSIGN_FORM_ID. Only active sellers are offered, loaded from the
// API when the dropdown is opened (40 at a time).
const AssignSellerForm = ({ supplier, loadSellerOptions, onSubmit, apiError = "" }) => {
  const [sellerId, setSellerId] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!sellerId) {
      setError("Select a seller");
      return;
    }

    onSubmit(sellerId);
  };

  return (
    <form id={ASSIGN_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-5">
      {apiError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {apiError}
        </div>
      )}

      <p className="text-sm text-gray-600">
        Choose the seller <span className="font-medium text-gray-900">{supplier.name}</span> will work under. A
        supplier works under one seller at a time; to move to a different seller later, unassign first.
      </p>

      <Select
        label="Seller"
        name="sellerId"
        value={sellerId}
        onChange={(event) => {
          setSellerId(event.target.value);
          setError("");
        }}
        isAsync
        loadOptions={loadSellerOptions}
        error={error}
        isRequired
        placeholder="Select a seller"
        noOptionsText="No active sellers found"
      />
    </form>
  );
};

export default AssignSellerForm;
