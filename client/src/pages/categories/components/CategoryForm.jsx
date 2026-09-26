import { useState } from "react";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const buildInitialValues = (initialValues) => ({
  name: initialValues?.name || "",
  description: initialValues?.description || "",
  status: initialValues?.status || "active",
});

const CategoryForm = ({
  initialValues,
  onSubmit,
  onCancel,
  submitting = false,
  apiError = "",
  submitLabel = "Save Category",
}) => {
  const [values, setValues] = useState(() => buildInitialValues(initialValues));
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const nextErrors = {};
    if (!values.name.trim()) nextErrors.name = "Category name is required";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      name: values.name.trim(),
      description: values.description.trim(),
      status: values.status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-5">
      {apiError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{apiError}</div>
      )}

      <Input
        label="Category Name"
        name="name"
        value={values.name}
        onChange={handleChange}
        error={errors.name}
        required
        placeholder="e.g. Stationery"
      />

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          name="description"
          value={values.description}
          onChange={handleChange}
          rows={3}
          placeholder="Optional category description"
          className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <div className="sm:w-56">
        <Select
          label="Status"
          name="status"
          value={values.status}
          onChange={handleChange}
          options={STATUS_OPTIONS}
        />
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-5">
        <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};

export default CategoryForm;
