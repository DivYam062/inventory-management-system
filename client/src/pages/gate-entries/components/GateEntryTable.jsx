import { Ban, Eye, Pencil } from "lucide-react";
import Table from "../../../components/ui/Table";
import Badge from "../../../components/ui/Badge";
import StatusBadge from "../../../components/common/StatusBadge";
import { formatDateTime } from "../../../utils/formatDate";

const ActionButton = ({ icon: Icon, label, onClick, hoverClasses, isDisabled = false }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={isDisabled}
    title={label}
    aria-label={label}
    className={`rounded-lg p-1.5 text-gray-400 transition disabled:cursor-not-allowed disabled:opacity-40 ${hoverClasses}`}
  >
    <Icon size={16} />
  </button>
);

// canEdit: the current user's gate-entry:edit permission, which also covers cancelling. Edit and cancel only
// apply to a pending entry. A gate entry can never be deleted.
const GateEntryTable = ({ entries, loading, canEdit, busyId, onView, onEdit, onCancel }) => {
  const columns = [
    {
      key: "gateEntryNumber",
      header: "Gate Entry",
      render: (entry) => <span className="font-medium text-gray-900">{entry.gateEntryNumber}</span>,
    },
    {
      key: "source",
      header: "Source",
      render: (entry) =>
        entry.purchaseOrder ? (
          <Badge variant="blue">{entry.purchaseOrder.poNumber}</Badge>
        ) : (
          <Badge variant="gray">Direct</Badge>
        ),
    },
    {
      key: "seller",
      header: "Seller",
      render: (entry) => (
        <div className="min-w-0">
          <p className="truncate text-gray-900">{entry.seller?.name || "—"}</p>
          <p className="truncate text-xs text-gray-500">{entry.supplier?.name || "—"}</p>
        </div>
      ),
    },
    {
      key: "arrivalAt",
      header: "Arrived",
      render: (entry) => <span className="whitespace-nowrap text-gray-600">{formatDateTime(entry.arrivalAt)}</span>,
    },
    {
      key: "vehicleNumber",
      header: "Vehicle",
      render: (entry) => <span className="whitespace-nowrap text-gray-600">{entry.vehicleNumber || "—"}</span>,
    },
    {
      key: "packages",
      header: "Packages",
      className: "text-right",
      render: (entry) => <span className="tabular-nums text-gray-700">{entry.packages ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (entry) => <StatusBadge status={entry.status} />,
    },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (entry) => {
        const isPending = entry.status === "pending";
        const isBusy = busyId === entry.id;

        return (
          <div className="flex items-center justify-end gap-1">
            <ActionButton
              icon={Eye}
              label={`View ${entry.gateEntryNumber}`}
              onClick={() => onView(entry)}
              hoverClasses="hover:bg-gray-100 hover:text-gray-700"
              isDisabled={isBusy}
            />

            {canEdit && isPending && (
              <>
                <ActionButton
                  icon={Pencil}
                  label={`Edit ${entry.gateEntryNumber}`}
                  onClick={() => onEdit(entry)}
                  hoverClasses="hover:bg-blue-50 hover:text-blue-600"
                  isDisabled={isBusy}
                />
                <ActionButton
                  icon={Ban}
                  label={`Cancel ${entry.gateEntryNumber}`}
                  onClick={() => onCancel(entry)}
                  hoverClasses="hover:bg-orange-50 hover:text-orange-600"
                  isDisabled={isBusy}
                />
              </>
            )}
          </div>
        );
      },
    },
  ];

  return <Table columns={columns} data={entries} loading={loading} emptyMessage="No gate entries found" keyField="id" />;
};

export default GateEntryTable;
