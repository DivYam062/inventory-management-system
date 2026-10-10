import { useState } from "react";
import Input from "../../../components/ui/Input";
import Select from "../../../components/ui/Select";
import Toggle from "../../../components/ui/Toggle";
import { RESTRICTIONS } from "../../../utils/inputRestrictions";

export const USER_FORM_ID = "user-form";

const EMAIL_PATTERN = /^\S+@\S+\.\S+$/;

// Same limits as the server (bcrypt ignores anything past 72 bytes).
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

const passwordProblem = (password, confirmPassword) => {
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    return { password: `Use ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters` };
  }
  if (password !== confirmPassword) return { confirmPassword: "Passwords do not match" };
  return null;
};

// Create / edit form for an organization user. Rendered inside a Modal; the modal footer's submit button
// targets this form through USER_FORM_ID.
//   roles   the roles the current user may assign: [{ id, name }]
// Editing: the password is optional (leave it blank to keep the current one). A user cannot change their
// own role or status, so those are locked when editing yourself.
const UserForm = ({ user, roles, onSubmit, apiError = "" }) => {
  const isEdit = Boolean(user);
  const isSelf = Boolean(user?.isSelf);

  const [values, setValues] = useState(() => ({
    name: user?.name ?? "",
    email: user?.email ?? "",
    phone: user?.phone ?? "",
    roleId: user?.role?.id ?? "",
    status: user?.status ?? "active",
    password: "",
    confirmPassword: "",
  }));
  const [errors, setErrors] = useState({});

  // The user's current role is always selectable, even if the assignable list would not include it.
  const roleOptions = roles.map((role) => ({ value: role.id, label: role.name }));
  if (user?.role && !roleOptions.some((option) => option.value === user.role.id)) {
    roleOptions.unshift({ value: user.role.id, label: user.role.name });
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!values.name.trim()) nextErrors.name = "Name is required";
    // The email is fixed once the user exists, so it is only checked when creating.
    if (!isEdit && !EMAIL_PATTERN.test(values.email.trim())) nextErrors.email = "Enter a valid email address";
    if (!values.roleId) nextErrors.roleId = "Select a role";

    // Required when creating; when editing only if the admin is resetting it.
    if (!isEdit || values.password || values.confirmPassword) {
      Object.assign(nextErrors, passwordProblem(values.password, values.confirmPassword));
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;

    const payload = {
      name: values.name.trim(),
      phone: values.phone.trim(),
    };

    // The email is the login and cannot be changed, so it is only sent when creating a user.
    if (!isEdit) payload.email = values.email.trim();

    // Your own role and status cannot be changed, so they are not sent when editing yourself.
    if (!isSelf) {
      payload.roleId = values.roleId;
      payload.status = values.status;
    }

    if (!isEdit || values.password) payload.password = values.password;

    onSubmit(payload);
  };

  return (
    <form id={USER_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-6">
      {apiError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {apiError}
        </div>
      )}

      <section className="space-y-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="Name"
            name="name"
            value={values.name}
            onChange={handleChange}
            error={errors.name}
            isRequired
            placeholder="Full name"
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
          label="Email"
          name="email"
          type="email"
          value={values.email}
          onChange={handleChange}
          error={errors.email}
          isRequired
          isDisabled={isEdit}
          placeholder="name@company.com"
          helperText={isEdit ? "The email is the login and cannot be changed." : "This is the email the user signs in with."}
        />
      </section>

      <section className="space-y-5 border-t border-gray-100 pt-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Access</h3>
          <p className="mt-0.5 text-sm text-gray-500">The role decides which pages and actions this user can use.</p>
        </div>

        <Select
          label="Role"
          name="roleId"
          value={values.roleId}
          onChange={handleChange}
          options={roleOptions}
          error={errors.roleId}
          isRequired
          isDisabled={isSelf}
          placeholder="Select a role"
          noOptionsText="No roles available. Create a role first."
          helperText={
            isSelf
              ? "You cannot change your own role."
              : roleOptions.length === 0
                ? "Create a role under Settings > Roles first."
                : undefined
          }
        />

        <div className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-900">User status</p>
            <p className="mt-0.5 text-sm text-gray-500">
              {isSelf
                ? "You cannot deactivate yourself."
                : values.status === "active"
                  ? "Active - the user can sign in."
                  : "Inactive - the user cannot sign in."}
            </p>
          </div>

          <Toggle
            label={values.status === "active" ? "Active" : "Inactive"}
            name="status"
            isChecked={values.status === "active"}
            isDisabled={isSelf}
            onChange={(event) =>
              handleChange({ target: { name: "status", value: event.target.checked ? "active" : "inactive" } })
            }
            className="shrink-0"
          />
        </div>
      </section>

      <section className="space-y-5 border-t border-gray-100 pt-6">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{isEdit ? "Reset password" : "Password"}</h3>
          <p className="mt-0.5 text-sm text-gray-500">
            {isEdit
              ? "Leave both fields empty to keep the current password."
              : "The user signs in with this password and can change it later."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label={isEdit ? "New Password" : "Password"}
            name="password"
            type="password"
            autoComplete="new-password"
            value={values.password}
            onChange={handleChange}
            error={errors.password}
            isRequired={!isEdit}
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
            isRequired={!isEdit}
          />
        </div>
      </section>
    </form>
  );
};

export default UserForm;
