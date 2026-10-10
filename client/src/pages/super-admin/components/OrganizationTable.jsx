import { Pencil, Trash2 } from "lucide-react";
import Table from "../../../components/ui/Table";
import StatusBadge from "../../../components/common/StatusBadge";
import Toggle from "../../../components/ui/Toggle";
import OrganizationAvatar from "../../../components/common/OrganizationAvatar";

const OrganizationTable = ({ organizations, loading, togglingId, onToggleStatus, onEdit, onDelete }) => {
  const columns = [
    {
      key: "name",
      header: "Organization",
      render: (organization) => (
        <div className="flex min-w-0 items-center gap-3">
          <OrganizationAvatar organization={organization} />
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-900">{organization.name}</p>
            <p className="truncate text-xs text-gray-500">{organization.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "companyRoute",
      header: "Company Route",
      render: (organization) => (
        <span className="rounded-md bg-gray-100 px-2 py-1 font-mono text-xs text-gray-600">
          /{organization.companyRoute}
        </span>
      ),
    },
    {
      key: "phone",
      header: "Phone",
      render: (organization) => (
        <span className="text-gray-600">{organization.phone || "—"}</span>
      ),
    },
    {
      key: "userCount",
      header: "Users",
      className: "text-right",
      render: (organization) => (
        <span className="tabular-nums text-gray-700">{organization.userCount}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (organization) => <StatusBadge status={organization.status} />,
    },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (organization) => (
        <div className="flex items-center justify-end gap-1">
          <Toggle
            size="sm"
            aria-label={`${organization.status === "active" ? "Deactivate" : "Activate"} ${organization.name}`}
            isChecked={organization.status === "active"}
            isDisabled={togglingId === organization.id}
            onChange={() => onToggleStatus(organization)}
            className="mr-2"
          />

          <button
            type="button"
            onClick={() => onEdit(organization)}
            title="Edit organization"
            aria-label={`Edit ${organization.name}`}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
          >
            <Pencil size={16} />
          </button>

          <button
            type="button"
            onClick={() => onDelete(organization)}
            title="Delete organization"
            aria-label={`Delete ${organization.name}`}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      data={organizations}
      loading={loading}
      emptyMessage="No organizations found"
      keyField="id"
    />
  );
};

export default OrganizationTable;
