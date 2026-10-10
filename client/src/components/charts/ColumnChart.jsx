import { CHART_COLORS, niceScale, useChartTooltip } from "./chartUtils";
import ChartTooltip from "./ChartTooltip";

// Single-series column chart (counts over an ordered axis, e.g. months).
//   data: [{ key, label, tooltipTitle, value }]   unit: "organization" -> "1 organization", "2 organizations"
//
// One hue, so no legend (the card title says what is plotted). Marks follow the chart spec: columns
// are at most 24px wide, rounded only at the data end, grown from a single baseline; grid is hairline.
// Only the peak and the latest value are labeled on the cap; every column has a tooltip (hover and
// keyboard focus) and a screen-reader table carries all values.
const PLOT_HEIGHT = 176;
const TICK_COUNT = 4;

const ColumnChart = ({ data, unit = "item", ariaLabel }) => {
  const { containerRef, tooltip, show, hide } = useChartTooltip();

  const maxValue = Math.max(0, ...data.map((d) => d.value));
  const { step, max } = niceScale(maxValue, TICK_COUNT);
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, index) => index * step);

  const peakIndex = maxValue > 0 ? data.findIndex((d) => d.value === maxValue) : -1;
  const latestIndex = data.length - 1;

  const plural = (value) => (value === 1 ? unit : `${unit}s`);

  return (
    <div ref={containerRef} className="relative" onPointerLeave={hide}>
      <div className="flex gap-3">
        <div
          className="flex shrink-0 flex-col-reverse justify-between text-right text-xs tabular-nums text-gray-500"
          style={{ height: PLOT_HEIGHT }}
          aria-hidden="true"
        >
          {ticks.map((tick) => (
            <span key={tick} className="leading-none">
              {tick.toLocaleString()}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative" style={{ height: PLOT_HEIGHT }} role="group" aria-label={ariaLabel}>
            {ticks.map((tick, index) => (
              <div
                key={tick}
                aria-hidden="true"
                className="absolute inset-x-0 border-t"
                style={{ bottom: `${(index / TICK_COUNT) * 100}%`, borderColor: CHART_COLORS.grid }}
              />
            ))}

            <div className="absolute inset-0 flex">
              {data.map((item, index) => {
                const heightPercent = (item.value / max) * 100;
                const showLabel = item.value > 0 && (index === peakIndex || index === latestIndex);
                const isActive = tooltip?.content.key === item.key;

                const readout = {
                  key: item.key,
                  title: item.tooltipTitle,
                  value: item.value.toLocaleString(),
                  unit: plural(item.value),
                  color: CHART_COLORS.series,
                };

                return (
                  <div
                    key={item.key}
                    tabIndex={0}
                    role="img"
                    aria-label={`${item.tooltipTitle}: ${item.value} ${plural(item.value)}`}
                    onPointerEnter={(e) => show(e.currentTarget, readout)}
                    onFocus={(e) => show(e.currentTarget, readout)}
                    onBlur={hide}
                    className={`relative flex min-w-0 flex-1 flex-col items-center justify-end rounded-md outline-none transition-colors focus-visible:ring-2 focus-visible:ring-blue-200 ${
                      isActive ? "bg-gray-50" : ""
                    }`}
                  >
                    {showLabel && (
                      <span className="mb-1 text-xs font-semibold tabular-nums text-gray-900">{item.value}</span>
                    )}

                    <div
                      className="w-6 rounded-t-sm transition-colors"
                      style={{
                        height: `${heightPercent}%`,
                        backgroundColor: isActive ? CHART_COLORS.seriesHover : CHART_COLORS.series,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-2 flex" aria-hidden="true">
            {data.map((item) => (
              <span key={item.key} className="min-w-0 flex-1 text-center text-xs text-gray-500">
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      <table className="sr-only">
        <caption>{ariaLabel}</caption>
        <thead>
          <tr>
            <th scope="col">Period</th>
            <th scope="col">Count</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.key}>
              <th scope="row">{item.tooltipTitle}</th>
              <td>{item.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ChartTooltip tooltip={tooltip} />
    </div>
  );
};

export default ColumnChart;
