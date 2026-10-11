import { useCallback, useEffect, useState } from "react";
import Badge from "../../../components/ui/Badge";
import Table from "../../../components/ui/Table";
import Pagination from "../../../components/common/Pagination";
import ErrorState from "../../../components/common/ErrorState";
import { formatDateTime } from "../../../utils/formatDate";
import { getErrorMessage } from "../../../utils/getErrorMessage";
import { getStockHistory } from "../../../services/inventoryService";

const HISTORY_PAGE_SIZE = 8;

const columns = (unit) => [
  {
    key: "createdAt",
    header: "When",
    render: (entry) => <span className="whitespace-nowrap text-gray-600">{formatDateTime(entry.createdAt)}</span>,
  },
  {
    key: "changedQty",
    header: "Change",
    className: "text-right",
    render: (entry) => (
      <span className={`whitespace-nowrap font-medium tabular-nums ${entry.changedQty > 0 ? "text-green-700" : "text-red-600"}`}>
        {entry.changedQty > 0 ? "+" : ""}
        {entry.changedQty} {unit}
      </span>
    ),
  },
  {
    key: "stock",
    header: "Stock",
    className: "text-right",
    render: (entry) => (
      <span className="whitespace-nowrap tabular-nums text-gray-600">
        {entry.previousQty} → <span className="font-medium text-gray-900">{entry.newQty}</span>
      </span>
    ),
  },
  {
    key: "source",
    header: "Source",
    render: (entry) =>
      entry.source === "putaway" ? (
        <Badge variant="blue">Putaway {entry.refNumber}</Badge>
      ) : (
        <Badge variant="orange">Manual</Badge>
      ),
  },
  {
    key: "reason",
    header: "Reason",
    render: (entry) => <span className="text-gray-600">{entry.reason || <span className="text-gray-400">—</span>}</span>,
  },
  {
    key: "performedBy",
    header: "By",
    render: (entry) => <span className="text-gray-600">{entry.performedBy?.name || "—"}</span>,
  },
];

const StockHistory = ({ row }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, meta } = await getStockHistory(row.product.id, { page, limit: HISTORY_PAGE_SIZE });
      setEntries(data);
      setTotalPages(meta?.total_page ?? 1);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load the history."));
    } finally {
      setLoading(false);
    }
  }, [row.product.id, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch on open / page change; no data-fetching library is set up in this project yet
    load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <p className="text-sm font-medium text-gray-900">{row.product.name}</p>
        <p className="text-xs text-gray-500">{row.product.sku}</p>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <Table columns={columns(row.product.unit)} data={entries} loading={loading} emptyMessage="No changes yet" keyField="id" />
          {!loading && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
        </>
      )}
    </div>
  );
};

export default StockHistory;
