import { Link } from "react-router-dom";
import { ArrowRight, CircleAlert, ScrollText } from "lucide-react";
import Card from "../../../components/ui/Card";
import StatusBadge from "../../../components/common/StatusBadge";
import EmptyState from "../../../components/common/EmptyState";
import ColumnChart from "../../../components/charts/ColumnChart";
import BarList from "../../../components/charts/BarList";
import { formatCurrency } from "../../../utils/currency";
import { formatDate, formatDateTime } from "../../../utils/formatDate";

// The panels of the organization dashboard. Each one is rendered only when the server sent its section, so a
// role sees just what it may view. `to` is the in-app path of the page a panel's "View all" link opens.

const ViewAll = ({ to, label = "View All" }) => (
  <Link to={to} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700">
    {label}
    <ArrowRight size={14} />
  </Link>
);

const toColumns = (perDay) =>
  perDay.map((day) => ({
    key: day.date,
    label: new Date(`${day.date}T00:00:00Z`).toLocaleDateString("en", { weekday: "short", timeZone: "UTC" }),
    tooltipTitle: new Date(`${day.date}T00:00:00Z`).toLocaleDateString("en", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" }),
    value: day.count,
  }));

const hasAny = (perDay) => perDay.some((day) => day.count > 0);

const RecentList = ({ items, emptyTitle }) =>
  items.length === 0 ? (
    <p className="py-4 text-center text-sm text-gray-500">{emptyTitle}</p>
  ) : (
    <ul className="divide-y divide-gray-100">
      {items.map((item) => (
        <li key={item.key} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-gray-900">{item.primary}</p>
            <p className="truncate text-xs text-gray-500">{item.secondary}</p>
          </div>
          <div className="shrink-0 text-right">{item.right}</div>
        </li>
      ))}
    </ul>
  );

const SubTitle = ({ children }) => <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-gray-500 first:mt-0">{children}</p>;

const statusItems = (byStatus, labels) =>
  labels.map(([key, label]) => ({ key, label, value: byStatus[key] ?? 0 }));

export const NeedsActionPanel = ({ tracking, paths }) => (
  <Card title="Needs your action" description="Open items that are waiting for someone to act" actions={<ViewAll to={paths.tracking} />}>
    {tracking.needsActionList.length === 0 ? (
      <EmptyState icon={CircleAlert} title="Nothing needs action" description="Everything is moving along." />
    ) : (
      <RecentList
        emptyTitle=""
        items={tracking.needsActionList.map((entry) => ({
          key: `${entry.type}-${entry.id}`,
          primary: `${entry.number} · ${entry.stageLabel}`,
          secondary: entry.action,
          right: <StatusBadge status={entry.stage} label={entry.stageLabel} />,
        }))}
      />
    )}
  </Card>
);

export const FlowPanel = ({ tracking, paths }) => (
  <Card title="Flow overview" description="Purchase orders and deliveries by stage" actions={<ViewAll to={paths.tracking} />}>
    {tracking.total === 0 ? (
      <EmptyState title="Nothing to track yet" description="Purchase orders and deliveries appear here as they are made." />
    ) : (
      <BarList
        unit="record"
        ariaLabel="Records by stage"
        items={statusItems(tracking.stages, [
          ["awaiting_delivery", "Awaiting delivery"],
          ["at_gate", "At the gate"],
          ["awaiting_inspection", "Awaiting inspection"],
          ["awaiting_putaway", "Awaiting putaway"],
          ["completed", "Completed"],
        ])}
      />
    )}
  </Card>
);

export const PurchaseOrdersPanel = ({ data, paths }) => (
  <Card title="Purchase orders" description={`${data.total} in total, ${data.open} open`} actions={<ViewAll to={paths.purchaseOrders} />}>
    <SubTitle>Created in the last 7 days</SubTitle>
    {hasAny(data.perDay) ? (
      <ColumnChart data={toColumns(data.perDay)} unit="purchase order" ariaLabel="Purchase orders created per day" />
    ) : (
      <p className="py-4 text-center text-sm text-gray-500">None were created in the last 7 days.</p>
    )}

    <SubTitle>By status</SubTitle>
    <BarList
      unit="order"
      ariaLabel="Purchase orders by status"
      items={statusItems(data.byStatus, [
        ["draft", "Draft"],
        ["issued", "Issued"],
        ["partially_received", "Partially received"],
        ["received", "Received"],
        ["cancelled", "Cancelled"],
      ])}
    />

    <SubTitle>Latest</SubTitle>
    <RecentList
      emptyTitle="No purchase orders yet."
      items={data.recent.map((order) => ({
        key: order.id,
        primary: `${order.poNumber} · ${order.seller?.name ?? "—"}`,
        secondary: `${formatCurrency(order.totalAmount, order.currency)} · ${formatDate(order.createdAt)}`,
        right: <StatusBadge status={order.status} />,
      }))}
    />
  </Card>
);

export const GateEntriesPanel = ({ data, paths }) => (
  <Card
    title="Gate entries"
    description={`${data.pending} waiting at the gate, ${data.arrivalsToday} arrived today`}
    actions={<ViewAll to={paths.gateEntries} />}
  >
    <SubTitle>Arrivals in the last 7 days</SubTitle>
    {hasAny(data.perDay) ? (
      <ColumnChart data={toColumns(data.perDay)} unit="arrival" ariaLabel="Arrivals per day" />
    ) : (
      <p className="py-4 text-center text-sm text-gray-500">Nothing arrived in the last 7 days.</p>
    )}

    <SubTitle>Latest</SubTitle>
    <RecentList
      emptyTitle="No gate entries yet."
      items={data.recent.map((entry) => ({
        key: entry.id,
        primary: `${entry.gateEntryNumber} · ${entry.seller?.name ?? "—"}`,
        secondary: `${entry.vehicleNumber ? `${entry.vehicleNumber} · ` : ""}${formatDateTime(entry.arrivalAt)}`,
        right: <StatusBadge status={entry.status} />,
      }))}
    />
  </Card>
);

export const GrnsPanel = ({ data, paths }) => (
  <Card title="GRNs" description={`${data.total} in total, ${data.pendingInspection} awaiting inspection`} actions={<ViewAll to={paths.grns} />}>
    <SubTitle>Received in the last 7 days</SubTitle>
    {hasAny(data.perDay) ? (
      <ColumnChart data={toColumns(data.perDay)} unit="GRN" ariaLabel="GRNs per day" />
    ) : (
      <p className="py-4 text-center text-sm text-gray-500">No goods were received in the last 7 days.</p>
    )}

    <SubTitle>By status</SubTitle>
    <BarList
      unit="GRN"
      ariaLabel="GRNs by status"
      items={statusItems(data.byStatus, [
        ["pending_inspection", "Pending inspection"],
        ["inspected", "Inspected"],
        ["putaway_partial", "Putaway partial"],
        ["putaway_complete", "Putaway complete"],
        ["cancelled", "Cancelled"],
      ])}
    />

    <SubTitle>Latest</SubTitle>
    <RecentList
      emptyTitle="No GRNs yet."
      items={data.recent.map((grn) => ({
        key: grn.id,
        primary: `${grn.grnNumber} · ${grn.seller?.name ?? "—"}`,
        secondary: `${grn.receivedQty} received · ${formatDateTime(grn.receivedAt)}`,
        right: <StatusBadge status={grn.status} />,
      }))}
    />
  </Card>
);

export const PutawaysPanel = ({ data, paths }) => (
  <Card title="Putaway" description={`${data.total} in total, ${data.lastDays} in the last 7 days`} actions={<ViewAll to={paths.putaway} />}>
    <SubTitle>Put away in the last 7 days</SubTitle>
    {hasAny(data.perDay) ? (
      <ColumnChart data={toColumns(data.perDay)} unit="putaway" ariaLabel="Putaways per day" />
    ) : (
      <p className="py-4 text-center text-sm text-gray-500">Nothing was put away in the last 7 days.</p>
    )}

    <SubTitle>Latest</SubTitle>
    <RecentList
      emptyTitle="No putaways yet."
      items={data.recent.map((putaway) => ({
        key: putaway.id,
        primary: `${putaway.putawayNumber}${putaway.grnNumber ? ` · ${putaway.grnNumber}` : ""}`,
        secondary: formatDateTime(putaway.putawayAt),
        right: <span className="text-sm font-semibold tabular-nums text-gray-900">{putaway.totalQty}</span>,
      }))}
    />
  </Card>
);

export const InventoryPanel = ({ data, paths }) => (
  <Card
    title="Inventory"
    description={`${data.inStock} in stock, ${data.outOfStock} out of stock`}
    actions={<ViewAll to={paths.stock} />}
  >
    <SubTitle>Most stock</SubTitle>
    {data.topStock.length === 0 ? (
      <p className="py-4 text-center text-sm text-gray-500">No stock yet. Products appear after their goods are put away.</p>
    ) : (
      <BarList
        unit="unit"
        ariaLabel="Products with the most stock"
        items={data.topStock.map((row) => ({ key: row.productId, label: row.name, value: row.quantity }))}
      />
    )}

    <SubTitle>Stock changes in the last 7 days</SubTitle>
    {hasAny(data.changesPerDay) ? (
      <ColumnChart data={toColumns(data.changesPerDay)} unit="change" ariaLabel="Stock changes per day" />
    ) : (
      <p className="py-4 text-center text-sm text-gray-500">The stock did not change in the last 7 days.</p>
    )}
  </Card>
);

export const ActivityPanel = ({ data, paths }) => (
  <Card title="Recent activity" description="The latest entries of the audit log" actions={<ViewAll to={paths.audit} />}>
    {data.recent.length === 0 ? (
      <EmptyState icon={ScrollText} title="No activity recorded yet" description="Entries appear as things are done." />
    ) : (
      <RecentList
        emptyTitle=""
        items={data.recent.map((entry) => ({
          key: entry.id,
          primary: entry.summary,
          secondary: `${entry.performedBy ?? "Someone"} · ${formatDateTime(entry.createdAt)}`,
          right: <span className="text-xs font-medium text-gray-500">{entry.entityNumber}</span>,
        }))}
      />
    )}
  </Card>
);
