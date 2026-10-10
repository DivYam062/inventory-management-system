import { Lock, Pencil, Trash2 } from "lucide-react";
import Table from "../../../components/ui/Table";
import Badge from "../../../components/ui/Badge";
import Toggle from "../../../components/ui/Toggle";
import StatusBadge from "../../../components/common/StatusBadge";

const UserAvatar = ({ name }) => (
  <span
    aria-hidden="true"
    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600"
  >
    {name?.charAt(0).toUpperCase()}
  </span>
);

// canEdit: the current user's own user:edit permission. A row additionally has to be manageable (not a
// system user, and no more powerful than the current user) for its actions to appear; you can edit
// yourself but not delete or deactivate yourself.
const UserTable = ({ users, loading, canEdit, togglingId, onToggleStatus, onEdit, onDelete }) => {
  const columns = [
    {
      key: "name",
      header: "User",
      render: (user) => (
        <div className="flex min-w-0 items-center gap-3">
          <UserAvatar name={user.name} />
          <div className="min-w-0">
            <p className="flex items-center gap-2 truncate font-medium text-gray-900">
              {user.name}
              {user.isSelf && <Badge variant="gray">You</Badge>}
            </p>
            <p className="truncate text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (user) =>
        user.isProtected ? (
          <Badge variant="blue">
            <Lock size={11} aria-hidden="true" />
            {user.role?.name ?? "System"}
          </Badge>
        ) : user.role ? (
          <Badge variant="gray">{user.role.name}</Badge>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (user) => <span className="text-gray-600">{user.phone || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (user) => <StatusBadge status={user.status} />,
    },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (user) => {
        const manageable = canEdit && user.canManage;

        if (!manageable) {
          return (
            <span className="text-xs text-gray-400" title={user.isProtected ? "System users cannot be changed" : undefined}>
              {user.isProtected ? "Protected" : "—"}
            </span>
          );
        }

        return (
          <div className="flex items-center justify-end gap-1">
            {!user.isSelf && (
              <Toggle
                size="sm"
                aria-label={`${user.status === "active" ? "Deactivate" : "Activate"} ${user.name}`}
                isChecked={user.status === "active"}
                isDisabled={togglingId === user.id}
                onChange={() => onToggleStatus(user)}
                className="mr-2"
              />
            )}

            <button
              type="button"
              onClick={() => onEdit(user)}
              title="Edit user"
              aria-label={`Edit ${user.name}`}
              className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
            >
              <Pencil size={16} />
            </button>

            {!user.isSelf && (
              <button
                type="button"
                onClick={() => onDelete(user)}
                title="Delete user"
                aria-label={`Delete ${user.name}`}
                className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return <Table columns={columns} data={users} loading={loading} emptyMessage="No users found" keyField="id" />;
};

export default UserTable;
