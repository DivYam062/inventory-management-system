import { useState } from "react";
import Input from "../../../components/ui/Input";
import Toggle from "../../../components/ui/Toggle";
import ImageUpload from "../../../components/ui/ImageUpload";
import { buildImageUrl } from "../../../utils/buildImageUrl";
import { RESTRICTIONS } from "../../../utils/inputRestrictions";
import {
  BRANDING_COLOR_FIELDS,
  DEFAULT_BRANDING,
  HEX_COLOR_PATTERN,
} from "../../../utils/branding";

const ROUTE_PATTERN = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;
const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

// Same limits as the server (bcrypt ignores anything past 72 bytes).
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

export const ORGANIZATION_FORM_ID = "organization-form";

const slugify = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);

const buildInitialValues = (organization) => ({
  name: organization?.name || "",
  companyRoute: organization?.companyRoute || "",
  email: organization?.email || "",
  phone: organization?.phone || "",
  address: organization?.address || "",
  status: organization?.status || "active",
  password: "",
  confirmPassword: "",
  useCustomColors: organization?.branding?.useCustomColors ?? false,
  ...Object.fromEntries(
    BRANDING_COLOR_FIELDS.map(({ key }) => [key, organization?.branding?.[key] || DEFAULT_BRANDING[key]])
  ),
});

const FormSection = ({ title, description, action, children }) => (
  <section className="border-b border-gray-100 pb-6 last:border-b-0 last:pb-0">
    <div className="flex min-h-6 items-center justify-between gap-4">
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      {action}
    </div>
    {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
    <div className="mt-4 space-y-5">{children}</div>
  </section>
);

const ColorField = ({ label, name, value, onChange, error, isDisabled }) => (
  <div>
    <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
    <div
      className={`flex items-center gap-2 rounded-lg border p-1.5 transition ${
        isDisabled ? "bg-gray-50" : "bg-white"
      } ${
        error
          ? "border-red-300 focus-within:ring-2 focus-within:ring-red-100"
          : "border-gray-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100"
      }`}
    >
      {/* The native picker is hidden behind a rounded swatch so it matches the rest of the UI. */}
      <span
        className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-black/10"
        style={{ backgroundColor: HEX_COLOR_PATTERN.test(value) ? value : "#ffffff" }}
      >
        <input
          type="color"
          aria-label={`${label} color picker`}
          value={HEX_COLOR_PATTERN.test(value) ? value : "#000000"}
          onChange={(e) => onChange({ target: { name, value: e.target.value } })}
          disabled={isDisabled}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
      </span>

      <input
        type="text"
        name={name}
        value={value}
        onChange={onChange}
        disabled={isDisabled}
        maxLength={7}
        spellCheck={false}
        aria-label={`${label} hex value`}
        className="w-full min-w-0 bg-transparent font-mono text-sm uppercase text-gray-900 outline-none disabled:cursor-not-allowed disabled:text-gray-500"
      />
    </div>
    {error && <p className="mt-1.5 text-sm text-red-600">{error}</p>}
  </div>
);

const BrandingPreview = ({ colors, isCustom }) => {
  const safe = Object.fromEntries(
    BRANDING_COLOR_FIELDS.map(({ key }) => [
      key,
      isCustom && HEX_COLOR_PATTERN.test(colors[key]) ? colors[key] : DEFAULT_BRANDING[key],
    ])
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Preview</p>
        {!isCustom && <span className="text-xs text-gray-500">System default colors</span>}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: safe.primary }}
        >
          Primary
        </span>
        <span
          className="rounded-lg px-4 py-2 text-sm font-medium text-white"
          style={{ backgroundColor: safe.primaryDark }}
        >
          Hover / Dark
        </span>
        <span
          className="rounded-lg px-4 py-2 text-sm font-medium"
          style={{ backgroundColor: safe.primaryLighter, color: safe.primaryDark }}
        >
          Selected item
        </span>
        <span
          className="rounded-full px-3 py-1 text-xs font-medium text-white"
          style={{ backgroundColor: safe.primaryLight }}
        >
          Badge
        </span>
      </div>
    </div>
  );
};

// Create/edit form for an organization. Rendered inside a Modal; the modal footer's submit
// button targets this form through ORGANIZATION_FORM_ID.
// On edit, the company route and email are read-only (the route is the organization's URL and
// the email is its Network Admin login).
const OrganizationForm = ({ organization, onSubmit, apiError = "" }) => {
  const isEdit = Boolean(organization);

  const [values, setValues] = useState(() => buildInitialValues(organization));
  const [routeEdited, setRouteEdited] = useState(false);
  const [errors, setErrors] = useState({});
  // Logo: a newly chosen file, or removed = the user cleared the existing one.
  const [logo, setLogo] = useState({ file: null, removed: false });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setValues((prev) => {
      const next = { ...prev, [name]: value };

      if (name === "name" && !isEdit && !routeEdited) next.companyRoute = slugify(value);

      return next;
    });
    if (name === "companyRoute") setRouteEdited(true);
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!values.name.trim()) nextErrors.name = "Organization name is required";

    if (!isEdit) {
      if (!ROUTE_PATTERN.test(values.companyRoute)) {
        nextErrors.companyRoute = "Use 3-32 lowercase letters, numbers or hyphens";
      }
      if (!EMAIL_PATTERN.test(values.email.trim())) nextErrors.email = "Enter a valid email address";

      if (values.password.length < MIN_PASSWORD_LENGTH || values.password.length > MAX_PASSWORD_LENGTH) {
        nextErrors.password = `Use ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters`;
      } else if (values.password !== values.confirmPassword) {
        nextErrors.confirmPassword = "Passwords do not match";
      }
    }

    BRANDING_COLOR_FIELDS.forEach(({ key }) => {
      if (!HEX_COLOR_PATTERN.test(values[key])) nextErrors[key] = "Use a hex color like #2563eb";
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const branding = {
      useCustomColors: values.useCustomColors,
      ...Object.fromEntries(BRANDING_COLOR_FIELDS.map(({ key }) => [key, values[key]])),
    };

    const common = {
      name: values.name.trim(),
      phone: values.phone.trim(),
      address: values.address.trim(),
      branding,
      logoFile: logo.file,
      removeLogo: logo.removed && Boolean(organization?.logo),
    };

    onSubmit(
      isEdit
        ? { ...common, status: values.status }
        : {
            ...common,
            companyRoute: values.companyRoute,
            email: values.email.trim(),
            password: values.password,
          }
    );
  };

  return (
    <form id={ORGANIZATION_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-6">
      {apiError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {apiError}
        </div>
      )}

      <FormSection title="Organization" description="Who this organization is and where its app lives.">
        <ImageUpload
          label="Logo"
          initialUrl={organization?.logo ? buildImageUrl(organization.logo) : null}
          onChange={setLogo}
          helperText="Optional. Shown in the organization's sidebar. JPEG, PNG, WEBP or GIF, max 2MB."
        />

        <Input
          label="Organization Name"
          name="name"
          value={values.name}
          onChange={handleChange}
          error={errors.name}
          isRequired
          placeholder="e.g. Acme Foods"
        />

        <Input
          label="Company Route"
          name="companyRoute"
          value={values.companyRoute}
          onChange={handleChange}
          error={errors.companyRoute}
          isRequired
          isDisabled={isEdit}
          placeholder="e.g. acme-foods"
          helperText={
            isEdit
              ? "The company route cannot be changed after creation."
              : `The organization's app will be at /${values.companyRoute || "company-route"}/dashboard`
          }
        />

        {isEdit && (
          <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-900">Organization status</p>
              <p className="mt-0.5 text-sm text-gray-500">
                {values.status === "active"
                  ? "Active - its users can sign in."
                  : "Inactive - its users cannot sign in."}
              </p>
            </div>

            <Toggle
              label={values.status === "active" ? "Active" : "Inactive"}
              name="status"
              isChecked={values.status === "active"}
              onChange={(e) =>
                handleChange({ target: { name: "status", value: e.target.checked ? "active" : "inactive" } })
              }
              className="shrink-0"
            />
          </div>
        )}
      </FormSection>

      <FormSection title="Contact" description="How to reach this organization.">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Email"
            name="email"
            type="email"
            value={values.email}
            onChange={handleChange}
            error={errors.email}
            isRequired
            isDisabled={isEdit}
            placeholder="admin@company.com"
            helperText={isEdit ? undefined : "Becomes the Network Admin's login email."}
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
          rows={2}
          value={values.address}
          onChange={handleChange}
          placeholder="Optional"
        />
      </FormSection>

      {!isEdit && (
        <FormSection
          title="Network Admin"
          description="The organization's administrator signs in with the email above and this password. They can change it after signing in. A protected Support user is created for the organization automatically."
        >
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={values.password}
              onChange={handleChange}
              error={errors.password}
              isRequired
              helperText={`${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters`}
            />
            <Input
              label="Confirm Password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              isRequired
            />
          </div>
        </FormSection>
      )}

      <FormSection
        title="Branding"
        description="When on, this organization's UI uses these colors. When off, the system defaults are used."
        action={
          <Toggle
            label="Use Custom Colors"
            name="useCustomColors"
            isChecked={values.useCustomColors}
            onChange={handleChange}
            className="shrink-0"
          />
        }
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {BRANDING_COLOR_FIELDS.map(({ key, label }) => (
            <ColorField
              key={key}
              label={label}
              name={key}
              value={values[key]}
              onChange={handleChange}
              error={errors[key]}
              isDisabled={!values.useCustomColors}
            />
          ))}
        </div>

        <BrandingPreview colors={values} isCustom={values.useCustomColors} />
      </FormSection>
    </form>
  );
};

export default OrganizationForm;
