import { useState } from "react";
import Input from "../../../components/ui/Input";
import Toggle from "../../../components/ui/Toggle";

export const CATEGORY_FORM_ID = "category-form";

// Create / edit form for a category. Rendered inside a Modal; the modal footer's submit button targets
// this form through CATEGORY_FORM_ID.
const CategoryForm = ({ category, onSubmit, apiError = "" }) => {
  const isEdit = Boolean(category);

  const [values, setValues] = useState(() => ({
    name: category?.name ?? "",
    description: category?.description ?? "",
    status: category?.status ?? "active",
  }));
  const [errors, setErrors] = useState({});

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!values.name.trim()) {
      setErrors({ name: "Category name is required" });
      return;
    }

    onSubmit({
      name: values.name.trim(),
      description: values.description.trim(),
      status: values.status,
    });
  };

  return (
    <form id={CATEGORY_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-5">
      {apiError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {apiError}
        </div>
      )}

      <Input
        label="Category Name"
        name="name"
        value={values.name}
        onChange={handleChange}
        error={errors.name}
        isRequired
        maxLength={100}
        placeholder="e.g. Dairy"
      />

      <Input
        label="Description"
        name="description"
        type="textarea"
        rows={3}
        value={values.description}
        onChange={handleChange}
        maxLength={500}
        placeholder="Optional"
      />

      <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Category status</p>
          <p className="mt-0.5 text-sm text-gray-500">
            {values.status === "active"
              ? "Active - products can be added to this category."
              : "Inactive - the category is kept but hidden when choosing a category."}
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

      {isEdit && category.productCount > 0 && (
        <p className="text-xs text-gray-500">
          Used by {category.productCount} product{category.productCount === 1 ? "" : "s"}.
        </p>
      )}
    </form>
  );
};

export default CategoryForm;
