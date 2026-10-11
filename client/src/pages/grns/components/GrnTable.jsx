import { Ban, ClipboardCheck, Eye } from "lucide-react";
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

// Passed / failed are known only once the GRN has been inspected.
const wasInspected = (grn) => ["inspected", "putaway_partial", "putaway_complete"].includes(grn.status);

// What the GRN was made from: the gate entry, the purchase order, or nothing (direct).
const SourceBadges = ({ grn }) => {
  if (grn.gateEntry) {
    return (
      <div className="flex flex-wrap gap-1">
        <Badge variant="orange">{grn.gateEntry.gateEntryNumber}</Badge>
        {grn.purchaseOrder && <Badge variant="blue">{grn.purchaseOrder.poNumber}</Badge>}
      </div>
    );
  }

  return grn.purchaseOrder ? <Badge variant="blue">{grn.purchaseOrder.poNumber}</Badge> : <Badge variant="gray">Direct</Badge>;
};

// canEdit: the current user's grn:edit permission, which covers inspecting and cancelling. Both only apply
// to a GRN that is pending inspection. A GRN can never be deleted.
const GrnTable = ({ grns, loading, canEdit, busyId, onView, onInspect, onCancel }) => {
  const columns = [
    {
      key: "grnNumber",
      header: "GRN",
      render: (grn) => <span className="font-medium text-gray-900">{grn.grnNumber}</span>,
    },
    {
      key: "source",
      header: "Source",
      render: (grn) => <SourceBadges grn={grn} />,
    },
    {
      key: "seller",
      header: "Seller",
      render: (grn) => (
        <div className="min-w-0">
          <p className="truncate text-gray-900">{grn.seller?.name || "—"}</p>
          <p className="truncate text-xs text-gray-500">{grn.supplier?.name || "—"}</p>
        </div>
      ),
    },
    {
      key: "receivedAt",
      header: "Received",
      render: (grn) => <span className="whitespace-nowrap text-gray-600">{formatDateTime(grn.receivedAt)}</span>,
    },
    {
      key: "itemCount",
      header: "Items",
      className: "text-right",
      render: (grn) => <span className="tabular-nums text-gray-700">{grn.itemCount}</span>,
    },
    {
      key: "receivedQty",
      header: "Received",
      className: "text-right",
      render: (grn) => <span className="tabular-nums text-gray-900">{grn.totals?.receivedQty ?? 0}</span>,
    },
    {
      key: "passedQty",
      header: "Passed",
      className: "text-right",
      render: (grn) => (
        <span className="tabular-nums text-green-700">{wasInspected(grn) ? grn.totals.passedQty : "—"}</span>
      ),
    },
    {
      key: "failedQty",
      header: "Failed",
      className: "text-right",
      render: (grn) => (
        <span className={`tabular-nums ${wasInspected(grn) && grn.totals.failedQty > 0 ? "text-red-600" : "text-gray-700"}`}>
          {wasInspected(grn) ? grn.totals.failedQty : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (grn) => <StatusBadge status={grn.status} />,
    },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (grn) => {
        const isPending = grn.status === "pending_inspection";
        const isBusy = busyId === grn.id;

        return (
          <div className="flex items-center justify-end gap-1">
            <ActionButton
              icon={Eye}
              label={`View ${grn.grnNumber}`}
              onClick={() => onView(grn)}
              hoverClasses="hover:bg-gray-100 hover:text-gray-700"
              isDisabled={isBusy}
            />

            {canEdit && isPending && (
              <>
                <ActionButton
                  icon={ClipboardCheck}
                  label={`Inspect ${grn.grnNumber}`}
                  onClick={() => onInspect(grn)}
                  hoverClasses="hover:bg-green-50 hover:text-green-600"
                  isDisabled={isBusy}
                />
                <ActionButton
                  icon={Ban}
                  label={`Cancel ${grn.grnNumber}`}
                  onClick={() => onCancel(grn)}
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

  return <Table columns={columns} data={grns} loading={loading} emptyMessage="No GRNs found" keyField="id" />;
};

export default GrnTable;
