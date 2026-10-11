// A label with its value, for read-only detail views. Shows a dash when there is no value.
const DetailField = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
    <dd className="mt-1.5 wrap-break-word text-sm font-medium text-gray-900">{children || <span className="text-gray-400">—</span>}</dd>
  </div>
);

export default DetailField;
