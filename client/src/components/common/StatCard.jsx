const ACCENT_CLASSES = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  yellow: "bg-yellow-50 text-yellow-700",
  red: "bg-red-50 text-red-600",
  gray: "bg-gray-100 text-gray-600",
  purple: "bg-purple-50 text-purple-600",
};

const StatCard = ({ icon: Icon, label, value, accent = "blue" }) => {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${ACCENT_CLASSES[accent]}`}
      >
        <Icon size={22} />
      </div>

      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="mt-0.5 text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
};

export default StatCard;
