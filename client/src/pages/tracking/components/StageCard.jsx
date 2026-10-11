const ACCENT_CLASSES = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  yellow: "bg-yellow-50 text-yellow-700",
  red: "bg-red-50 text-red-600",
  gray: "bg-gray-100 text-gray-600",
};

// A count at one stage of the flow, which is also a filter: clicking it shows only what is at that stage and
// clicking it again clears the filter (`isActive` marks the one currently applied). Every card has the same
// height and its label stays on one line, so a row of them lines up whatever the labels are.
const StageCard = ({ icon: Icon, label, value, accent = "blue", isActive = false, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={isActive}
    className={`flex h-full min-h-[88px] w-full items-center justify-between gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 ${
      isActive ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200 hover:border-gray-300 hover:shadow"
    }`}
  >
    <div className="min-w-0">
      <p className="truncate text-sm text-gray-500" title={label}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-gray-900">{value}</p>
    </div>

    <span aria-hidden="true" className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${ACCENT_CLASSES[accent]}`}>
      <Icon size={20} />
    </span>
  </button>
);

export default StageCard;
