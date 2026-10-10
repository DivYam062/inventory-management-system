import { Eye, Lock, Pencil, Trash2 } from "lucide-react";
import Table from "../../../components/ui/Table";
import Badge from "../../../components/ui/Badge";

const countPermissions = (role) => role.permissions.reduce((sum, entry) => sum + entry.actions.length, 0);

// canEdit / canDelete: the user's own role:edit / role:delete permission. A row additionally has to be
// manageable (not a system role, and no stronger than the user) for those actions to appear.
const RoleTable = ({ roles, loading, canEdit, canDelete, onView, onEdit, onDelete }) => {
  const columns = [
    {
      key: "name",
      header: "Role",
      render: (role) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{role.name}</span>
          {role.isProtected && (
            <Badge variant="blue">
              <Lock size={11} aria-hidden="true" />
              System
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "permissions",
      header: "Permissions",
      render: (role) =>
        role.isProtected ? (
          <span className="text-gray-600">All permissions</span>
        ) : (
          <span className="text-gray-600">
            {countPermissions(role) === 0
              ? "None"
              : `${countPermissions(role)} across ${role.permissions.length} feature${role.permissions.length === 1 ? "" : "s"}`}
          </span>
        ),
    },
    {
      key: "userCount",
      header: "Users",
      className: "text-right",
      render: (role) => <span className="tabular-nums text-gray-700">{role.userCount}</span>,
    },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (role) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onView(role)}
            title="View permissions"
            aria-label={`View ${role.name}`}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          >
            <Eye size={16} />
          </button>

          {canEdit && role.canManage && (
            <button
              type="button"
              onClick={() => onEdit(role)}
              title="Edit role"
              aria-label={`Edit ${role.name}`}
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
            >
              <Pencil size={16} />
            </button>
          )}

          {canDelete && role.canManage && (
            <button
              type="button"
              onClick={() => onDelete(role)}
              title="Delete role"
              aria-label={`Delete ${role.name}`}
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ),
    },
  ];

  return <Table columns={columns} data={roles} loading={loading} emptyMessage="No roles found" keyField="id" />;
};

export default RoleTable;
