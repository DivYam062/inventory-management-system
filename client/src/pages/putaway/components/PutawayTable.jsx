import { Eye } from "lucide-react";
import Table from "../../../components/ui/Table";
import Badge from "../../../components/ui/Badge";
import { formatDateTime } from "../../../utils/formatDate";

// A putaway is a permanent record, so the only action is viewing it.
const PutawayTable = ({ putaways, loading, busyId, onView }) => {
  const columns = [
    {
      key: "putawayNumber",
      header: "Putaway",
      render: (putaway) => <span className="font-medium text-gray-900">{putaway.putawayNumber}</span>,
    },
    {
      key: "grn",
      header: "GRN",
      render: (putaway) => (putaway.grn ? <Badge variant="blue">{putaway.grn.grnNumber}</Badge> : <span className="text-gray-400">—</span>),
    },
    {
      key: "seller",
      header: "Seller",
      render: (putaway) => (
        <div className="min-w-0">
          <p className="truncate text-gray-900">{putaway.seller?.name || "—"}</p>
          <p className="truncate text-xs text-gray-500">{putaway.supplier?.name || "—"}</p>
        </div>
      ),
    },
    {
      key: "putawayAt",
      header: "Put Away",
      render: (putaway) => <span className="whitespace-nowrap text-gray-600">{formatDateTime(putaway.putawayAt)}</span>,
    },
    {
      key: "itemCount",
      header: "Items",
      className: "text-right",
      render: (putaway) => <span className="tabular-nums text-gray-700">{putaway.itemCount}</span>,
    },
    {
      key: "totalQty",
      header: "Total Quantity",
      className: "text-right",
      render: (putaway) => <span className="tabular-nums text-gray-900">{putaway.totalQty}</span>,
    },
    {
      key: "performedBy",
      header: "By",
      render: (putaway) => <span className="text-gray-600">{putaway.performedBy?.name || "—"}</span>,
    },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (putaway) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={() => onView(putaway)}
            disabled={busyId === putaway.id}
            title="View putaway"
            aria-label={`View ${putaway.putawayNumber}`}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Eye size={16} />
          </button>
        </div>
      ),
    },
  ];

  return <Table columns={columns} data={putaways} loading={loading} emptyMessage="No putaways found" keyField="id" />;
};

export default PutawayTable;
