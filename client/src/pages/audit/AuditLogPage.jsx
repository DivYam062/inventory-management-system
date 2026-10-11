import { useCallback, useEffect, useState } from "react";
import { Eye, ScrollText, X } from "lucide-react";
import PageHeader from "../../components/common/PageHeader";
import ErrorState from "../../components/common/ErrorState";
import EmptyState from "../../components/common/EmptyState";
import Pagination from "../../components/common/Pagination";
import SearchBar from "../../components/common/SearchBar";
import StatusBadge from "../../components/common/StatusBadge";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Select from "../../components/ui/Select";
import Table from "../../components/ui/Table";
import Badge from "../../components/ui/Badge";
import Modal from "../../components/ui/Modal";
import { getAuditLogs } from "../../services/auditLogService";
import { formatDateTime } from "../../utils/formatDate";
import { getErrorMessage } from "../../utils/getErrorMessage";

const PAGE_SIZE = 10;

const ENTITY_LABELS = {
  purchase_order: "Purchase Order",
  gate_entry: "Gate Entry",
  grn: "GRN",
  putaway: "Putaway",
  inventory: "Stock",
  category: "Category",
  product: "Product",
  seller: "Seller",
  supplier: "Supplier",
  configuration: "Setting",
  user: "User",
  role: "Role",
};

const ACTION_LABELS = {
  created: { label: "Created", variant: "green" },
  updated: { label: "Edited", variant: "blue" },
  issued: { label: "Issued", variant: "blue" },
  inspected: { label: "Inspected", variant: "blue" },
  cancelled: { label: "Cancelled", variant: "red" },
  deleted: { label: "Deleted", variant: "red" },
  status_changed: { label: "Status changed", variant: "gray" },
  stock_increased: { label: "Stock increased", variant: "green" },
  stock_decreased: { label: "Stock decreased", variant: "orange" },
  assigned: { label: "Assigned", variant: "blue" },
  unassigned: { label: "Unassigned", variant: "orange" },
  password_changed: { label: "Password changed", variant: "yellow" },
  password_reset: { label: "Password reset", variant: "yellow" },
};

// The date inputs hold YYYY-MM-DD in the user's own calendar; the API gets the start of the first day and the
// end of the last day in that time zone, so a whole day is included.
const startOfDay = (value) => new Date(`${value}T00:00:00`).toISOString();
const endOfDay = (value) => new Date(`${value}T23:59:59.999`).toISOString();

// "receivedQty" -> "Received qty"
const humanize = (key) => {
  const spaced = key.replace(/([A-Z])/g, " $1").replace(/_/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.length === 0 ? "—" : value.map(formatValue).join(", ");
  if (typeof value === "object") return Object.entries(value).map(([key, inner]) => `${humanize(key)}: ${formatValue(inner)}`).join(", ");
  return String(value);
};

const StatusChange = ({ entry }) => {
  if (!entry.previousStatus && !entry.newStatus) return <span className="text-gray-400">—</span>;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {entry.previousStatus && <StatusBadge status={entry.previousStatus} />}
      {entry.previousStatus && entry.newStatus && entry.previousStatus !== entry.newStatus && <span className="text-gray-400">→</span>}
      {entry.newStatus && entry.newStatus !== entry.previousStatus && <StatusBadge status={entry.newStatus} />}
    </div>
  );
};

const Field = ({ label, children }) => (
  <div>
    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900">{children || <span className="text-gray-400">—</span>}</dd>
  </div>
);

// Everything about one entry, shown in a modal. An edit lists each field that changed (before -> after); other
// extra facts (quantities, reasons, permissions) follow as plain rows.
const EntryDetails = ({ entry }) => {
  const action = ACTION_LABELS[entry.action];
  const { changes, ...rest } = entry.meta ?? {};
  const details = Object.entries(rest);

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-2 gap-4">
        <Field label="When">{formatDateTime(entry.createdAt)}</Field>
        <Field label="Done by">{entry.performedBy?.name}</Field>
        <Field label="Record">
          <span className="font-medium">{entry.entityNumber}</span> <span className="text-gray-500">({ENTITY_LABELS[entry.entityType]})</span>
        </Field>
        <Field label="Action">{action ? <Badge variant={action.variant}>{action.label}</Badge> : entry.action}</Field>
        <Field label="Status">{(entry.previousStatus || entry.newStatus) && <StatusChange entry={entry} />}</Field>
      </dl>

      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">What happened</p>
        <p className="mt-1 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-900">{entry.summary}</p>
      </div>

      {Array.isArray(changes) && changes.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">What changed</p>
          <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {changes.map((change) => (
              <div key={change.field} className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
                <dt className="text-gray-500">{change.field}</dt>
                <dd className="text-right text-gray-900">
                  <span className="text-gray-500 line-through decoration-gray-300">{change.from}</span>
                  <span className="mx-2 text-gray-400">→</span>
                  <span className="font-medium">{change.to}</span>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {details.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">Details</p>
          <dl className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {details.map(([key, value]) => (
              <div key={key} className="flex items-start justify-between gap-4 px-4 py-2.5 text-sm">
                <dt className="text-gray-500">{humanize(key)}</dt>
                <dd className="text-right text-gray-900">{formatValue(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
};

// A page of the audit log: who did what to which record, and when. One component serves all four Logs pages; each
// shows one group of records (see the wrappers in LogPages.jsx).
//   group        "inventory" | "catalog" | "configuration" | "user_role" - what the API is asked for
//   title, description   the page's heading
//   entityTypes  the record types of this group (a "record type" filter is shown when there is more than one)
//   actionKeys   the actions that can occur in this group (the "action" filter)
//   emptyText    what an empty log says
// Read-only: the log is never edited or deleted.
const AuditLogPage = ({ group, title, description, entityTypes, actionKeys, emptyText }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [viewTarget, setViewTarget] = useState(null);

  const typeOptions = [{ value: "", label: "All Records" }, ...entityTypes.map((value) => ({ value, label: ENTITY_LABELS[value] }))];
  const actionOptions = [{ value: "", label: "All Actions" }, ...actionKeys.map((value) => ({ value, label: ACTION_LABELS[value].label }))];

  // Debounce the raw search input before it drives the API call. Nothing happens unless the text really
  // changed, so opening the page (or paging) is never reset to page 1 by a stray timer.
  useEffect(() => {
    if (searchInput === search) return;

    const handle = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);

    return () => clearTimeout(handle);
  }, [searchInput, search]);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const { data, meta } = await getAuditLogs({
        group,
        search: search || undefined,
        entityType: entityType || undefined,
        action: action || undefined,
        from: from ? startOfDay(from) : undefined,
        to: to ? endOfDay(to) : undefined,
        page,
        limit: PAGE_SIZE,
      });

      if (data.length === 0 && meta && page > meta.total_page) {
        setPage(meta.total_page);
        return;
      }

      setEntries(data);
      setTotalPages(meta?.total_page ?? 1);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to load the logs."));
    } finally {
      setLoading(false);
    }
  }, [group, search, entityType, action, from, to, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional fetch-on-filter-change; no data-fetching library is set up in this project yet
    loadEntries();
  }, [loadEntries]);

  const hasActiveFilters = Boolean(searchInput || entityType || action || from || to);
  const invalidRange = Boolean(from && to && from > to);

  const handleClearFilters = () => {
    setSearchInput("");
    setSearch("");
    setEntityType("");
    setAction("");
    setFrom("");
    setTo("");
    setPage(1);
  };

  const columns = [
    {
      key: "createdAt",
      header: "When",
      render: (entry) => <span className="whitespace-nowrap text-gray-600">{formatDateTime(entry.createdAt)}</span>,
    },
    {
      key: "record",
      header: "Record",
      render: (entry) => (
        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{entry.entityNumber}</p>
          <p className="text-xs text-gray-500">{ENTITY_LABELS[entry.entityType]}</p>
        </div>
      ),
    },
    {
      key: "action",
      header: "Action",
      render: (entry) => {
        const meta = ACTION_LABELS[entry.action];
        return <Badge variant={meta?.variant ?? "gray"}>{meta?.label ?? entry.action}</Badge>;
      },
    },
    {
      key: "status",
      header: "Status",
      render: (entry) => <StatusChange entry={entry} />,
    },
    {
      key: "summary",
      header: "What Happened",
      render: (entry) => <span className="block max-w-md text-gray-700">{entry.summary}</span>,
    },
    {
      key: "performedBy",
      header: "By",
      render: (entry) => <span className="text-gray-600">{entry.performedBy?.name || "—"}</span>,
    },
    {
      key: "actions",
      header: "Action",
      className: "text-right",
      render: (entry) => (
        <button
          type="button"
          onClick={() => setViewTarget(entry)}
          title="View details"
          aria-label={`View details of ${entry.entityNumber} ${ACTION_LABELS[entry.action]?.label ?? entry.action}`}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <Eye size={16} />
        </button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title={title} description={description} />

      <Card bodyClassName="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div className="sm:w-72">
            <SearchBar value={searchInput} onChange={setSearchInput} placeholder="Search record, what happened or who..." />
          </div>

          {entityTypes.length > 1 && (
            <div className="sm:w-48">
              <Select
                aria-label="Filter by record type"
                value={entityType}
                onChange={(e) => {
                  setEntityType(e.target.value);
                  setPage(1);
                }}
                options={typeOptions}
              />
            </div>
          )}

          <div className="sm:w-48">
            <Select
              aria-label="Filter by action"
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              options={actionOptions}
            />
          </div>

          <div className="sm:w-44">
            <Input
              label="From"
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="sm:w-44">
            <Input
              label="To"
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              error={invalidRange ? "Before the From date" : undefined}
            />
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" icon={X} onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </Card>

      <div className="mt-6">
        {error ? (
          <ErrorState message={error} onRetry={loadEntries} />
        ) : (
          <Card title="Activity" description={hasActiveFilters ? "Filtered results" : "All recorded activity, newest first"}>
            {!loading && entries.length === 0 ? (
              <EmptyState
                icon={ScrollText}
                title={hasActiveFilters ? "No activity matches your filters" : "No activity recorded yet"}
                description={hasActiveFilters ? "Try a different search or change the filters above." : emptyText}
              />
            ) : (
              <>
                <Table columns={columns} data={entries} loading={loading} emptyMessage="No activity found" keyField="id" />
                {!loading && <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />}
              </>
            )}
          </Card>
        )}
      </div>

      <Modal
        isOpen={Boolean(viewTarget)}
        onClose={() => setViewTarget(null)}
        size="lg"
        headerProps={{ heading: "Log Entry", icon: ScrollText }}
        footerProps={{ secondaryButton: { text: "Close", onClick: () => setViewTarget(null) } }}
      >
        {viewTarget && <EntryDetails entry={viewTarget} />}
      </Modal>
    </div>
  );
};

export default AuditLogPage;
