import { Inbox } from "lucide-react";

const EmptyState = ({
  icon: Icon = Inbox,
  title = "No data found",
  description,
  action,
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <Icon size={22} />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>

      {action && <div className="mt-2">{action}</div>}
    </div>
  );
};

export default EmptyState;
