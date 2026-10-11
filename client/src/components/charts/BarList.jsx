import { CHART_COLORS, useChartTooltip } from "./chartUtils";
import ChartTooltip from "./ChartTooltip";

// Ranked horizontal bars (one series, sorted by the caller): label on the left, bar, value at the tip.
//   items: [{ key, label, value, leading? }]   leading = optional node shown before the label (e.g. an avatar)
//   unit:  "user" -> "1 user", "3 users"
const BarList = ({ items, unit = "item", ariaLabel }) => {
  const { containerRef, tooltip, show, hide } = useChartTooltip();

  const maxValue = Math.max(1, ...items.map((item) => item.value));
  const plural = (value) => (value === 1 ? unit : `${unit}s`);

  return (
    <div ref={containerRef} className="relative" onPointerLeave={hide}>
      <ul className="space-y-3" aria-label={ariaLabel}>
        {items.map((item) => {
          const isActive = tooltip?.content.key === item.key;

          const readout = {
            key: item.key,
            title: item.label,
            value: item.value.toLocaleString(),
            unit: plural(item.value),
            color: CHART_COLORS.series,
          };

          return (
            <li
              key={item.key}
              tabIndex={0}
              onPointerEnter={(e) => show(e.currentTarget, readout)}
              onFocus={(e) => show(e.currentTarget, readout)}
              onBlur={hide}
              className={`flex items-center gap-3 rounded-md px-1 py-0.5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-200 ${
                isActive ? "bg-gray-50" : ""
              }`}
            >
              <div className="flex w-36 shrink-0 items-center gap-2">
                {item.leading}
                <span className="truncate text-sm text-gray-700">{item.label}</span>
              </div>

              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div
                  className="h-3 rounded-r-sm transition-colors"
                  style={{
                    width: `${Math.max((item.value / maxValue) * 100, 2)}%`,
                    backgroundColor: isActive ? CHART_COLORS.seriesHover : CHART_COLORS.series,
                  }}
                />
                <span className="text-sm font-semibold tabular-nums text-gray-900">{item.value.toLocaleString()}</span>
              </div>
            </li>
          );
        })}
      </ul>

      <ChartTooltip tooltip={tooltip} />
    </div>
  );
};

export default BarList;
