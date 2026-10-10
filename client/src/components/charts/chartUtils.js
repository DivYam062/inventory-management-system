import { useCallback, useRef, useState } from "react";

// Chart colors. The series blue and the status colors come from the validated reference palette
// (single series -> one hue; status colors are reserved and always paired with an icon + label).
export const CHART_COLORS = {
  series: "#2a78d6",
  seriesHover: "#3987e5",
  good: "#0ca30c",
  neutral: "#9ca3af",
  grid: "#e5e7eb",
};

// Round the top of a count axis to a clean number so ticks read 0 / 2 / 4 / 6 / 8.
// Always whole numbers (these charts count things), and never fewer than `tickCount` units.
export const niceScale = (maxValue, tickCount = 4) => {
  if (!maxValue || maxValue <= 0) return { step: 1, max: tickCount };

  const raw = maxValue / tickCount;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
  const step = Math.max(1, Math.ceil(factor * magnitude));

  return { step, max: step * tickCount };
};

// Tooltip placement for charts whose marks are the hit targets (bars, segments, rows).
// `show(element, content)` anchors the tooltip above that element, inside `containerRef`.
export const useChartTooltip = () => {
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const show = useCallback((element, content) => {
    const container = containerRef.current;
    if (!container || !element) return;

    const containerRect = container.getBoundingClientRect();
    const rect = element.getBoundingClientRect();

    setTooltip({
      x: rect.left - containerRect.left + rect.width / 2,
      y: rect.top - containerRect.top,
      content,
    });
  }, []);

  const hide = useCallback(() => setTooltip(null), []);

  return { containerRef, tooltip, show, hide };
};
