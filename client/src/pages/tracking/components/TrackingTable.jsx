import { Eye } from "lucide-react";
import Table from "../../../components/ui/Table";
import Badge from "../../../components/ui/Badge";
import StatusBadge from "../../../components/common/StatusBadge";
import FlowStepper from "./FlowStepper";
import { formatDateTime } from "../../../utils/formatDate";

const TYPE_BADGES = {
  purchase_order: { label: "PO", variant: "blue" },
  gate_entry: { label: "Gate Entry", variant: "orange" },
  grn: { label: "GRN", variant: "green" },
};

const NextAction = ({ tracker }) => {
  const first = tracker.actions[0];

  if (!first) {
    return <span className="text-gray-500">{tracker.stage === "completed" ? "Nothing - all goods are in inventory" : "—"}</span>;
  }

  return (
    <div className="min-w-0">
      <p className={`text-sm ${first.target ? "font-medium text-gray-900" : "text-gray-600"}`}>{first.label}</p>
      {tracker.actions.length > 1 && <p className="text-xs text-gray-500">+ {tracker.actions.length - 1} more</p>}
    </div>
  );
};

const TrackingTable = ({ trackers, loading, busyKey, onView }) => {
  const columns = [
    {
      key: "number",
      header: "Reference",
      render: (tracker) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{tracker.number}</span>
          <Badge variant={TYPE_BADGES[tracker.type].variant}>{TYPE_BADGES[tracker.type].label}</Badge>
        </div>
      ),
    },
    {
      key: "seller",
      header: "Seller",
      render: (tracker) => (
        <div className="min-w-0">
          <p className="truncate text-gray-900">{tracker.seller?.name || "—"}</p>
          <p className="truncate text-xs text-gray-500">{tracker.supplier?.name || "—"}</p>
        </div>
      ),
    },
    {
      key: "progress",
      header: "Progress",
      render: (tracker) => (
        <div className="min-w-64">
          <FlowStepper stages={tracker.stages} size="sm" />
        </div>
      ),
    },
    {
      key: "stage",
      header: "Status",
      render: (tracker) => <StatusBadge status={tracker.stage} label={tracker.stageLabel} />,
    },
    {
      key: "next",
      header: "Next Action",
      render: (tracker) => <NextAction tracker={tracker} />,
    },
    {
      key: "lastActivityAt",
      header: "Last Activity",
      render: (tracker) => <span className="whitespace-nowrap text-gray-600">{formatDateTime(tracker.lastActivityAt)}</span>,
    },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (tracker) => (
        <button
          type="button"
          onClick={() => onView(tracker)}
          disabled={busyKey === `${tracker.type}-${tracker.id}`}
          title="Track"
          aria-label={`Track ${tracker.number}`}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  return <Table columns={columns} data={trackers} loading={loading} emptyMessage="Nothing to track" keyField="id" />;
};

export default TrackingTable;
