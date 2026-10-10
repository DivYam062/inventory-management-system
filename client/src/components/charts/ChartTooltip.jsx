// Floating readout for a hovered/focused mark. Values lead (strong), the label follows (secondary).
// `tooltip` comes from useChartTooltip; render it inside the chart container (position: relative).
// Text is rendered as React text nodes, never as HTML, because labels come from API data.
const ChartTooltip = ({ tooltip }) => {
  if (!tooltip) return null;

  const { x, y, content } = tooltip;

  return (
    <div
      role="status"
      className="pointer-events-none absolute z-20 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg"
      style={{ left: x, top: y - 8 }}
    >
      {content.title && <p className="text-gray-500">{content.title}</p>}

      <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-gray-900">
        {content.color && (
          <span aria-hidden="true" className="inline-block h-0.5 w-3 rounded-full" style={{ backgroundColor: content.color }} />
        )}
        <span className="tabular-nums">{content.value}</span>
        {content.unit && <span className="text-xs font-normal text-gray-500">{content.unit}</span>}
      </p>
    </div>
  );
};

export default ChartTooltip;
