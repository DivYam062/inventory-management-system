import { ArrowRight, CircleAlert, Hourglass } from "lucide-react";
import { Link } from "react-router-dom";
import Badge from "../../../components/ui/Badge";
import StatusBadge from "../../../components/common/StatusBadge";
import FlowStepper from "./FlowStepper";
import { usePermissions } from "../../../hooks/usePermissions";
import { actionPath, actionPageName } from "../../../utils/trackingLinks";
import { formatDateTime } from "../../../utils/formatDate";
import DetailField from "../../../components/common/DetailField";

const ITEM_STATUS = {
  not_arrived: { label: "Not arrived", variant: "gray" },
  partially_arrived: { label: "Partly arrived", variant: "yellow" },
  awaiting_inspection: { label: "Awaiting inspection", variant: "yellow" },
  awaiting_putaway: { label: "Awaiting putaway", variant: "blue" },
  in_inventory: { label: "In inventory", variant: "green" },
};

const Qty = ({ value, unit, tone = "" }) => (
  <span className={`whitespace-nowrap tabular-nums ${tone}`}>
    {value} <span className="text-xs text-gray-400">{unit}</span>
  </span>
);

const Actions = ({ tracker, companyRoute, onNavigate }) => {
  const { can } = usePermissions();

  if (tracker.actions.length === 0) {
    return (
      <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
        {tracker.stage === "cancelled" ? "This was cancelled. Nothing more to do." : "Nothing more to do - every received item is in inventory."}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {tracker.actions.map((action, index) => {
        const path = actionPath(action, companyRoute);
        const allowed = !action.permission || can(...action.permission);
        const isInfo = !action.target;

        return (
          <li
            key={`${action.key}-${action.documentId ?? index}`}
            className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 ${isInfo ? "border-gray-200 bg-gray-50" : "border-blue-200 bg-blue-50"}`}
          >
            <div className="flex min-w-0 items-start gap-3">
              {isInfo ? <Hourglass size={18} className="mt-0.5 shrink-0 text-gray-400" /> : <CircleAlert size={18} className="mt-0.5 shrink-0 text-blue-600" />}
              <p className={`text-sm ${isInfo ? "text-gray-700" : "font-medium text-gray-900"}`}>{action.label}</p>
            </div>

            {path && allowed && (
              <Link
                to={path}
                onClick={onNavigate}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700"
              >
                Open {actionPageName(action)}
                <ArrowRight size={14} />
              </Link>
            )}
            {path && !allowed && <span className="shrink-0 text-xs text-gray-500">You do not have permission to do this</span>}
          </li>
        );
      })}
    </ul>
  );
};

const TrackingDetails = ({ tracker, companyRoute, onNavigate }) => {
  const hasOrder = tracker.items.some((item) => item.orderedQty !== null);

  return (
    <div className="space-y-6">
      <dl className="grid grid-cols-2 gap-x-8 gap-y-6 rounded-xl border border-gray-200 bg-gray-50/60 p-5 sm:grid-cols-4">
        <DetailField label="Reference">{tracker.number}</DetailField>
        <DetailField label="Status">
          <StatusBadge status={tracker.stage} label={tracker.stageLabel} />
        </DetailField>
        <DetailField label="Seller">{tracker.seller?.name}</DetailField>
        <DetailField label="Supplier">{tracker.supplier?.name}</DetailField>
      </dl>

      <section aria-label="Flow" className="overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 px-4 py-5">
        <div className="min-w-176">
          <FlowStepper stages={tracker.stages} size="lg" />
        </div>
      </section>

      <section aria-label="Next actions">
        <h3 className="mb-2 text-sm font-semibold text-gray-900">What to do next</h3>
        <Actions tracker={tracker} companyRoute={companyRoute} onNavigate={onNavigate} />
      </section>

      <section aria-label="Items">
        <h3 className="mb-2 text-sm font-semibold text-gray-900">Items</h3>

        {tracker.items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500">
            No goods have been received yet, so there are no items to follow.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50">
                <tr className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3">Product</th>
                  {hasOrder && <th className="px-4 py-3 text-right">Ordered</th>}
                  {hasOrder && <th className="px-4 py-3 text-right">Still to arrive</th>}
                  <th className="px-4 py-3 text-right">At inspection</th>
                  <th className="px-4 py-3 text-right">Passed</th>
                  <th className="px-4 py-3 text-right">Failed</th>
                  <th className="px-4 py-3 text-right">In inventory</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tracker.items.map((item) => {
                  const status = ITEM_STATUS[item.status];
                  return (
                    <tr key={item.product?.id ?? item.status}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{item.product?.name || "—"}</p>
                        <p className="text-xs text-gray-500">{item.product?.sku}</p>
                      </td>
                      {hasOrder && (
                        <td className="px-4 py-3 text-right">
                          <Qty value={item.orderedQty} unit={item.unit} />
                        </td>
                      )}
                      {hasOrder && (
                        <td className="px-4 py-3 text-right">
                          <Qty value={item.pendingDeliveryQty} unit={item.unit} tone={item.pendingDeliveryQty > 0 ? "font-medium text-gray-900" : "text-gray-500"} />
                        </td>
                      )}
                      <td className="px-4 py-3 text-right">
                        <Qty value={item.atInspectionQty} unit={item.unit} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Qty value={item.passedQty} unit={item.unit} tone="text-green-700" />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Qty value={item.failedQty} unit={item.unit} tone={item.failedQty > 0 ? "text-red-600" : ""} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Qty value={item.putawayQty} unit={item.unit} tone="font-medium text-gray-900" />
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-gray-500">Last activity: {formatDateTime(tracker.lastActivityAt)}</p>
    </div>
  );
};

export default TrackingDetails;
