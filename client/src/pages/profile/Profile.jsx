import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CheckCircle2 } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import Card from "../../components/ui/Card";
import Input from "../../components/ui/Input";
import Button from "../../components/ui/Button";
import { updateProfile, changePassword } from "../../services/authService";
import { updateUser, updateToken } from "../../store/slices/authSlice";
import { RESTRICTIONS } from "../../utils/inputRestrictions";
import { getErrorMessage } from "../../utils/getErrorMessage";

// Same limits as the server (bcrypt ignores anything past 72 bytes).
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 72;

const SuccessMessage = ({ children }) => (
  <p role="status" className="flex items-center gap-2 text-sm text-green-600">
    <CheckCircle2 size={16} aria-hidden="true" />
    {children}
  </p>
);

const ErrorMessage = ({ children }) => (
  <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
    {children}
  </div>
);

// The signed-in user's own account (any role, including the Default Admin and the Super Admin):
// name and phone number, and a password change. The email is the login and can never be changed.
const AccountCard = () => {
  const dispatch = useDispatch();
  const { user, organization, isSuperAdmin } = useSelector((state) => state.auth);

  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const unchanged = name.trim() === (user?.name ?? "") && phone.trim() === (user?.phone ?? "");

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name.trim()) {
      setNameError("Name is required");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSaved(false);

      const { data } = await updateProfile({ name: name.trim(), phone: phone.trim() });

      dispatch(updateUser(data.user));
      setName(data.user.name);
      setPhone(data.user.phone ?? "");
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to update your profile."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card
      title="Account"
      description={
        isSuperAdmin
          ? "Super Admin"
          : `${user?.role?.name ?? ""}${organization?.name ? ` · ${organization.name}` : ""}`
      }
    >
      <form onSubmit={handleSubmit} noValidate className="max-w-xl space-y-5">
        {error && <ErrorMessage>{error}</ErrorMessage>}

        <div className="flex items-center gap-4">
          <span
            aria-hidden="true"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-600"
          >
            {user?.name?.charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-gray-900">{user?.name}</p>
            <p className="truncate text-sm text-gray-500">{user?.email}</p>
          </div>
        </div>

        <Input
          label="Name"
          name="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setNameError("");
            setSaved(false);
          }}
          error={nameError}
          isRequired
        />

        <Input
          label="Email"
          name="email"
          type="email"
          value={user?.email ?? ""}
          isDisabled
          readOnly
          helperText="Your email is your login and cannot be changed."
        />

        <Input
          label="Phone Number"
          name="phone"
          type="tel"
          restrictions={[{ name: RESTRICTIONS.PHONE }, { name: RESTRICTIONS.MAX_LENGTH, max: 20 }]}
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setSaved(false);
          }}
          placeholder="Optional"
        />

        <div className="flex items-center gap-4">
          <Button type="submit" loading={saving} disabled={unchanged}>
            Save Changes
          </Button>
          {saved && <SuccessMessage>Profile updated.</SuccessMessage>}
        </div>
      </form>
    </Card>
  );
};

const PasswordCard = () => {
  const dispatch = useDispatch();

  const [values, setValues] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => ({ ...previous, [name]: undefined }));
    setSaved(false);
  };

  const validate = () => {
    const next = {};

    if (!values.currentPassword) next.currentPassword = "Enter your current password";

    if (values.newPassword.length < MIN_PASSWORD_LENGTH || values.newPassword.length > MAX_PASSWORD_LENGTH) {
      next.newPassword = `Use ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters`;
    } else if (values.newPassword === values.currentPassword) {
      next.newPassword = "The new password must be different from the current one";
    } else if (values.newPassword !== values.confirmPassword) {
      next.confirmPassword = "Passwords do not match";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    try {
      setSaving(true);
      setError("");
      setSaved(false);

      const { data } = await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      // Every older session (including this one's old token) was signed out; keep this one going.
      dispatch(updateToken(data.token));
      setValues({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setSaved(true);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to change your password."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Change password" description="You will stay signed in here; your other sessions are signed out.">
      <form onSubmit={handleSubmit} noValidate className="max-w-xl space-y-5">
        {error && <ErrorMessage>{error}</ErrorMessage>}

        <Input
          label="Current Password"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          value={values.currentPassword}
          onChange={handleChange}
          error={errors.currentPassword}
          isRequired
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <Input
            label="New Password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            value={values.newPassword}
            onChange={handleChange}
            error={errors.newPassword}
            isRequired
            helperText={`${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} characters`}
          />
          <Input
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={handleChange}
            error={errors.confirmPassword}
            isRequired
          />
        </div>

        <div className="flex items-center gap-4">
          <Button type="submit" loading={saving}>
            Update Password
          </Button>
          {saved && <SuccessMessage>Password updated.</SuccessMessage>}
        </div>
      </form>
    </Card>
  );
};

const Profile = () => {
  return (
    <div>
      <PageHeader title="My Profile" description="Manage your own account details and password." />

      <div className="space-y-6">
        <AccountCard />
        <PasswordCard />
      </div>
    </div>
  );
};

export default Profile;
