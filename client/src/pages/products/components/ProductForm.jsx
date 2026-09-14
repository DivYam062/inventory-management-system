import { useEffect, useRef, useState } from "react";
import { ImageIcon, Upload, X } from "lucide-react";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Button from "../../../components/ui/Button";
import { buildImageUrl } from "../../../utils/buildImageUrl";

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const FormSection = ({ title, description, children }) => (
  <div className="border-b border-gray-100 pb-8 last:border-b-0 last:pb-0">
    <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
    {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
    <div className="mt-5 space-y-5">{children}</div>
  </div>
);

const buildInitialValues = (initialValues) => ({
  name: initialValues?.name || "",
  sku: initialValues?.sku || "",
  description: initialValues?.description || "",
  category: initialValues?.category?.id || "",
  supplier: initialValues?.supplier?.id || "",
  price: initialValues?.price ?? "",
  quantity: initialValues?.quantity ?? 0,
  minimumStock: initialValues?.minimumStock ?? 5,
  status: initialValues?.status || "active",
});

const ProductForm = ({
  initialValues,
  categories,
  suppliers,
  currency = "INR",
  onSubmit,
  onCancel,
  submitting = false,
  apiError = "",
  submitLabel = "Save Product",
}) => {
  const [values, setValues] = useState(() => buildInitialValues(initialValues));
  const [errors, setErrors] = useState({});

  const fileInputRef = useRef(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(
    initialValues?.image ? buildImageUrl(initialValues.image) : null
  );
  const [removeImage, setRemoveImage] = useState(false);
  const [imageError, setImageError] = useState("");

  // Release object URLs created for local previews once they're replaced or unmounted.
  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setImageError("Please choose a JPEG, PNG, WEBP or GIF image.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setImageError("Image must be smaller than 5MB.");
      return;
    }

    setImageError("");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveImage(false);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveImage(true);
    setImageError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const validate = () => {
    const nextErrors = {};

    if (!values.name.trim()) nextErrors.name = "Product name is required";
    if (!values.sku.trim()) nextErrors.sku = "SKU is required";
    if (!values.category) nextErrors.category = "Category is required";
    if (!values.supplier) nextErrors.supplier = "Supplier is required";

    if (values.price === "" || Number.isNaN(Number(values.price)) || Number(values.price) < 0) {
      nextErrors.price = "Enter a valid price";
    }
    if (values.quantity !== "" && (Number.isNaN(Number(values.quantity)) || Number(values.quantity) < 0)) {
      nextErrors.quantity = "Enter a valid quantity";
    }
    if (
      values.minimumStock !== "" &&
      (Number.isNaN(Number(values.minimumStock)) || Number(values.minimumStock) < 0)
    ) {
      nextErrors.minimumStock = "Enter a valid minimum stock";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      name: values.name.trim(),
      sku: values.sku.trim(),
      description: values.description.trim(),
      category: values.category,
      supplier: values.supplier,
      price: Number(values.price),
      quantity: Number(values.quantity),
      minimumStock: Number(values.minimumStock),
      status: values.status,
      imageFile,
      removeImage,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-8">
      {apiError && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{apiError}</div>
      )}

      <FormSection title="Basic Information" description="Identify this product in your catalog.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Product Name"
            name="name"
            value={values.name}
            onChange={handleChange}
            error={errors.name}
            required
            placeholder="e.g. Notebook Set"
          />
          <Input
            label="SKU"
            name="sku"
            value={values.sku}
            onChange={handleChange}
            error={errors.sku}
            required
            placeholder="e.g. NB-001"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Description
          </label>
          <textarea
            name="description"
            value={values.description}
            onChange={handleChange}
            rows={3}
            placeholder="Optional product description"
            className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </FormSection>

      <FormSection title="Product Image" description="Optional. Shown in the product list and details.">
        <div className="flex items-center gap-5">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
            {imagePreview ? (
              <img src={imagePreview} alt="Product preview" className="h-full w-full object-cover" />
            ) : (
              <ImageIcon size={28} className="text-gray-300" />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              onChange={handleImageChange}
              className="hidden"
            />

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={Upload}
                onClick={() => fileInputRef.current?.click()}
              >
                {imagePreview ? "Change Image" : "Upload Image"}
              </Button>

              {imagePreview && (
                <Button type="button" variant="ghost" size="sm" icon={X} onClick={handleRemoveImage}>
                  Remove
                </Button>
              )}
            </div>

            <p className="text-xs text-gray-500">JPEG, PNG, WEBP or GIF. Max 5MB.</p>
            {imageError && <p className="text-xs text-red-600">{imageError}</p>}
          </div>
        </div>
      </FormSection>

      <FormSection title="Classification" description="Link this product to a category and supplier.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Select
            label="Category"
            name="category"
            value={values.category}
            onChange={handleChange}
            error={errors.category}
            required
            placeholder="Select a category"
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            label="Supplier"
            name="supplier"
            value={values.supplier}
            onChange={handleChange}
            error={errors.supplier}
            required
            placeholder="Select a supplier"
            options={suppliers.map((s) => ({ value: s.id, label: s.name }))}
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
      </FormSection>

      <FormSection title="Pricing & Stock" description="Set the price and track available quantity.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <Input
            label={`Price (${currency})`}
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={values.price}
            onChange={handleChange}
            error={errors.price}
            required
          />
          <Input
            label="Quantity"
            name="quantity"
            type="number"
            min="0"
            step="1"
            value={values.quantity}
            onChange={handleChange}
            error={errors.quantity}
          />
          <Input
            label="Minimum Stock"
            name="minimumStock"
            type="number"
            min="0"
            step="1"
            value={values.minimumStock}
            onChange={handleChange}
            error={errors.minimumStock}
            helperText="Triggers the low-stock status"
          />
        </div>
      </FormSection>

      <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-6">
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

export default ProductForm;
