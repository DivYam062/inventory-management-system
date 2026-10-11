import { useState } from "react";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Toggle from "../../../components/ui/Toggle";
import ImageUpload from "../../../components/ui/ImageUpload";
import { RESTRICTIONS } from "../../../utils/inputRestrictions";
import { buildImageUrl } from "../../../utils/buildImageUrl";

export const PRODUCT_FORM_ID = "product-form";

// Create / edit form for a product. Rendered inside a Modal; the modal footer's submit button targets this
// form through PRODUCT_FORM_ID. Category and seller are required and loaded from the API when their
// dropdown is opened (active ones only, 40 at a time). The image is optional.
const ProductForm = ({
  product,
  loadCategoryOptions,
  loadSellerOptions,
  loadCurrencyOptions,
  loadUnitOptions,
  onSubmit,
  apiError = "",
}) => {
  const [values, setValues] = useState(() => ({
    name: product?.name ?? "",
    sku: product?.sku ?? "",
    barcode: product?.barcode ?? "",
    categoryId: product?.category?.id ?? "",
    sellerId: product?.seller?.id ?? "",
    price: product?.price !== undefined && product?.price !== null ? String(product.price) : "",
    currency: product?.currency ?? "",
    unit: product?.unit ?? "",
    description: product?.description ?? "",
    status: product?.status ?? "active",
  }));
  const [image, setImage] = useState({ file: null, removed: false });
  const [errors, setErrors] = useState({});

  // The saved category / seller may not be in the first page of the dropdown (or may be inactive now), so
  // their labels are supplied up front.
  const initialCategoryOptions = product?.category ? [{ value: product.category.id, label: product.category.name }] : [];
  const initialCurrencyOptions = product?.currency ? [{ value: product.currency, label: product.currency }] : [];
  const initialUnitOptions = product?.unit ? [{ value: product.unit, label: product.unit }] : [];
  const initialSellerOptions = product?.seller ? [{ value: product.seller.id, label: product.seller.name }] : [];

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const nextErrors = {};
    if (!values.name.trim()) nextErrors.name = "Product name is required";
    if (!values.sku.trim()) nextErrors.sku = "SKU is required";
    else if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(values.sku.trim())) {
      nextErrors.sku = "SKU can only contain letters, numbers and . _ / -";
    }
    if (values.barcode.trim() && !/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(values.barcode.trim())) {
      nextErrors.barcode = "Barcode can only contain letters, numbers and . _ / -";
    }
    if (!values.categoryId) nextErrors.categoryId = "Select a category";
    if (!values.sellerId) nextErrors.sellerId = "Select a seller";
    if (!values.unit) nextErrors.unit = "Select a unit of measurement";
    if (values.price.trim() && !values.currency) nextErrors.currency = "Select a currency for the price";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = {
      name: values.name.trim(),
      sku: values.sku.trim(),
      barcode: values.barcode.trim(),
      categoryId: values.categoryId,
      sellerId: values.sellerId,
      price: values.price.trim(),
      currency: values.price.trim() ? values.currency : "",
      unit: values.unit,
      description: values.description.trim(),
      status: values.status,
    };

    if (image.file) payload.imageFile = image.file;
    if (image.removed && product?.image) payload.removeImage = true;

    onSubmit(payload);
  };

  return (
    <form id={PRODUCT_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-5">
      {apiError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {apiError}
        </div>
      )}

      <ImageUpload
        label="Product Image"
        initialUrl={buildImageUrl(product?.image)}
        onChange={setImage}
        maxSizeMB={5}
        helperText="Optional. JPEG, PNG, WEBP or GIF. Max 5MB."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Input
          label="Product Name"
          name="name"
          value={values.name}
          onChange={handleChange}
          error={errors.name}
          isRequired
          maxLength={150}
          placeholder="e.g. Claw Hammer"
        />
        <Input
          label="SKU"
          name="sku"
          value={values.sku}
          onChange={handleChange}
          error={errors.sku}
          isRequired
          maxLength={50}
          placeholder="e.g. HAM-001"
        />
      </div>

      <Input
        label="Barcode"
        name="barcode"
        value={values.barcode}
        onChange={handleChange}
        error={errors.barcode}
        maxLength={50}
        placeholder="Optional. Scan the item's barcode here"
        helperText="Used to find this product when its barcode is scanned (e.g. when receiving goods). Unique per organization."
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="Category"
          name="categoryId"
          value={values.categoryId}
          onChange={handleChange}
          isAsync
          loadOptions={loadCategoryOptions}
          initialOptions={initialCategoryOptions}
          error={errors.categoryId}
          isRequired
          placeholder="Select a category"
          noOptionsText="No active categories found"
        />
        <Select
          label="Seller"
          name="sellerId"
          value={values.sellerId}
          onChange={handleChange}
          isAsync
          loadOptions={loadSellerOptions}
          initialOptions={initialSellerOptions}
          error={errors.sellerId}
          isRequired
          placeholder="Select a seller"
          noOptionsText="No active sellers found"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Select
          label="Unit of Measurement"
          name="unit"
          value={values.unit}
          onChange={handleChange}
          isAsync
          loadOptions={loadUnitOptions}
          initialOptions={initialUnitOptions}
          error={errors.unit}
          isRequired
          placeholder="Select a unit"
          noOptionsText="No units found"
        />
        <Input
          label="Price"
          name="price"
          restrictions={[{ name: RESTRICTIONS.DECIMAL, upto: 2 }, { name: RESTRICTIONS.MAX_LENGTH, max: 12 }]}
          value={values.price}
          onChange={handleChange}
          placeholder="Optional"
        />
        <Select
          label="Currency"
          name="currency"
          value={values.currency}
          onChange={handleChange}
          isAsync
          loadOptions={loadCurrencyOptions}
          initialOptions={initialCurrencyOptions}
          error={errors.currency}
          isRequired={Boolean(values.price.trim())}
          isClearable
          placeholder="Select a currency"
          noOptionsText="No currencies found"
        />
      </div>

      <Input
        label="Description"
        name="description"
        type="textarea"
        rows={3}
        value={values.description}
        onChange={handleChange}
        maxLength={1000}
        placeholder="Optional"
      />

      <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Product status</p>
          <p className="mt-0.5 text-sm text-gray-500">
            {values.status === "active"
              ? "Active - available when creating purchase orders."
              : "Inactive - kept on record but not offered when choosing a product."}
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

export default ProductForm;
