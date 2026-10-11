import { useState } from "react";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import PermissionPicker from "./PermissionPicker";
import { usePermissions } from "../../../hooks/usePermissions";

export const ROLE_FORM_ID = "role-form";

const toMap = (permissions = []) =>
  Object.fromEntries(permissions.map((entry) => [entry.resource, [...entry.actions]]));

// In the catalog's order, so what is sent does not depend on the order things were ticked.
const toList = (map, catalog) =>
  catalog
    .filter((feature) => map[feature.resource]?.length > 0)
    .map((feature) => ({ resource: feature.resource, actions: map[feature.resource] }));

// Create / edit / view form for a role: a name, then the permission checklist underneath.
// Rendered inside a Modal; the modal footer's submit button targets this form through ROLE_FORM_ID.
// `isReadOnly` shows a role without letting anything change (the protected Network Admin / Support roles).
const RoleForm = ({ role, catalog, onSubmit, apiError = "", isReadOnly = false }) => {
  const { can } = usePermissions();

  const [name, setName] = useState(role?.name ?? "");
  const [permissions, setPermissions] = useState(() => toMap(role?.permissions));
  const [nameError, setNameError] = useState("");

  // A role can only be given permissions the user holds themselves (the server enforces this too).
  const canGrant = (resource, action) => can(resource, action);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!name.trim()) {
      setNameError("Role name is required");
      return;
    }

    onSubmit({ name: name.trim(), permissions: toList(permissions, catalog) });
  };

  const selectedCount = Object.values(permissions).reduce((sum, actions) => sum + actions.length, 0);
  const totalCount = catalog.reduce((sum, feature) => sum + feature.actions.length, 0);

  const selectAll = () =>
    setPermissions(
      Object.fromEntries(
        catalog
          .map((feature) => [
            feature.resource,
            feature.actions.filter(
              (action) => canGrant(feature.resource, action) || (permissions[feature.resource] ?? []).includes(action)
            ),
          ])
          .filter(([, actions]) => actions.length > 0)
      )
    );

  const clearAll = () =>
    setPermissions(
      Object.fromEntries(
        Object.entries(permissions)
          .map(([resource, actions]) => [resource, actions.filter((action) => !canGrant(resource, action))])
          .filter(([, actions]) => actions.length > 0)
      )
    );

  return (
    <form id={ROLE_FORM_ID} onSubmit={handleSubmit} noValidate className="space-y-6">
      {apiError && (
        <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {apiError}
        </div>
      )}

      {isReadOnly && (
        <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-700">
          This is a system role. It always has every permission and cannot be changed.
        </div>
      )}

      <Input
        label="Role Name"
        name="name"
        value={name}
        onChange={(e) => {
          setName(e.target.value);
          setNameError("");
        }}
        error={nameError}
        isRequired
        isDisabled={isReadOnly}
        placeholder="e.g. Inventory Manager"
        maxLength={50}
      />

      <div>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Permissions</h3>
            <p className="mt-0.5 text-sm text-gray-500">
              Tick a feature to select all of its permissions, or pick them one by one. Edit also allows deleting.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium tabular-nums text-gray-600">
              {selectedCount} of {totalCount} selected
            </span>

            {!isReadOnly && (
              <>
                <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                  Select all
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={clearAll} disabled={selectedCount === 0}>
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>

        <PermissionPicker
          catalog={catalog}
          value={permissions}
          onChange={setPermissions}
          canGrant={canGrant}
          isReadOnly={isReadOnly}
        />
      </div>
    </form>
  );
};

export default RoleForm;
