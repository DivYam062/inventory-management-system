import { useChartTooltip } from "./chartUtils";
import ChartTooltip from "./ChartTooltip";

// Part-to-whole as one stacked horizontal bar with a legend underneath (always shown: 2+ series).
//   segments: [{ key, label, value, color, icon }]   icon = Lucide component, so a state never
//   relies on color alone. Segments are separated by a 2px surface gap; zero segments are skipped
//   in the bar but stay in the legend.
const SegmentedBar = ({ segments, unit = "item", ariaLabel }) => {
  const { containerRef, tooltip, show, hide } = useChartTooltip();

  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  const plural = (value) => (value === 1 ? unit : `${unit}s`);
  const percent = (value) => (total === 0 ? 0 : Math.round((value / total) * 100));

  const readoutFor = (segment) => ({
    key: segment.key,
    title: segment.label,
    value: segment.value.toLocaleString(),
    unit: `${plural(segment.value)} · ${percent(segment.value)}%`,
    color: segment.color,
  });

  return (
    <div ref={containerRef} className="relative" onPointerLeave={hide}>
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-gray-100" role="group" aria-label={ariaLabel}>
        {segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <div
              key={segment.key}
              tabIndex={0}
              role="img"
              aria-label={`${segment.label}: ${segment.value} ${plural(segment.value)}, ${percent(segment.value)}%`}
              onPointerEnter={(e) => show(e.currentTarget, readoutFor(segment))}
              onFocus={(e) => show(e.currentTarget, readoutFor(segment))}
              onBlur={hide}
              className="h-full outline-none transition-opacity hover:opacity-80 focus-visible:opacity-80"
              style={{ width: `${(segment.value / total) * 100}%`, backgroundColor: segment.color }}
            />
          ))}
      </div>

      <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {segments.map((segment) => {
          const Icon = segment.icon;

          return (
            <li key={segment.key} className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-50">
                <Icon size={16} style={{ color: segment.color }} aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold tabular-nums text-gray-900">
                  {segment.value.toLocaleString()}
                  <span className="ml-1.5 text-xs font-normal text-gray-500">{percent(segment.value)}%</span>
                </p>
                <p className="text-xs text-gray-500">{segment.label}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <ChartTooltip tooltip={tooltip} />
    </div>
  );
};

export default SegmentedBar;
