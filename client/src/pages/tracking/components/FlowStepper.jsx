import { Ban, Check, Minus } from "lucide-react";
import StatusBadge from "../../../components/common/StatusBadge";
import { formatDateTime } from "../../../utils/formatDate";

// The four steps of the flow with their state: done (green tick), current (blue, where it is now), pending
// (grey, not reached yet), skipped (dashed, the module is off) or cancelled (red).
const CIRCLE = {
  done: "border-green-500 bg-green-500 text-white",
  current: "border-blue-600 bg-white text-blue-600 ring-4 ring-blue-100",
  pending: "border-gray-300 bg-white text-gray-400",
  skipped: "border-dashed border-gray-300 bg-gray-50 text-gray-400",
  cancelled: "border-red-500 bg-red-500 text-white",
};

const LINE = { done: "bg-green-500", current: "bg-gray-200", pending: "bg-gray-200", skipped: "bg-gray-200", cancelled: "bg-gray-200" };

const STATE_TEXT = { done: "Done", current: "In progress", pending: "Not reached", skipped: "Skipped", cancelled: "Cancelled" };

const Marker = ({ state, index, size }) => {
  const dimension = size === "sm" ? "h-6 w-6 text-xs" : "h-9 w-9 text-sm";
  const iconSize = size === "sm" ? 12 : 16;

  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full border-2 font-semibold ${dimension} ${CIRCLE[state]}`}
    >
      {state === "done" ? <Check size={iconSize} /> : state === "cancelled" ? <Ban size={iconSize} /> : state === "skipped" ? <Minus size={iconSize} /> : index + 1}
    </span>
  );
};

// size "sm": a compact row of steps for list rows. size "lg": the full stepper with the documents of each step.
const FlowStepper = ({ stages, size = "sm" }) => {
  const isLarge = size === "lg";

  return (
    <ol className="flex items-start" aria-label="Progress">
      {stages.map((stage, index) => (
        <li key={stage.key} className={`flex ${index < stages.length - 1 ? "flex-1" : ""} items-start`} aria-current={stage.state === "current" ? "step" : undefined}>
          <div className={`flex shrink-0 flex-col items-center ${isLarge ? "w-40" : "w-14"}`}>
            <Marker state={stage.state} index={index} size={size} />
            <span className={`mt-1.5 text-center leading-tight ${isLarge ? "text-sm font-medium text-gray-900" : "text-[11px] text-gray-500"}`}>
              {stage.label}
            </span>
            <span className="sr-only">{STATE_TEXT[stage.state]}</span>

            {isLarge && (
              <div className="mt-2 w-full space-y-2 text-center">
                <p className="text-xs text-gray-500">{STATE_TEXT[stage.state]}</p>
                {stage.documents.map((document) => (
                  <div key={document.id} className="w-full min-w-0 rounded-lg border border-gray-200 bg-white px-2 py-2">
                    <p className="wrap-break-word text-xs font-semibold text-gray-900">{document.number}</p>
                    {document.status !== "done" && (
                      <div className="mt-1.5 flex justify-center">
                        <StatusBadge status={document.status} className="max-w-full" />
                      </div>
                    )}
                    <p className="mt-1.5 text-[11px] leading-snug text-gray-500">{formatDateTime(document.at)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {index < stages.length - 1 && (
            <span aria-hidden="true" className={`h-0.5 flex-1 ${isLarge ? "mt-4.25" : "mt-3"} ${LINE[stage.state]}`} />
          )}
        </li>
      ))}
    </ol>
  );
};

export default FlowStepper;
