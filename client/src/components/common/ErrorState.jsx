import { AlertTriangle } from "lucide-react";
import Button from "../ui/Button";

const ErrorState = ({
  title = "Something went wrong",
  message = "We couldn't load this data. Please try again.",
  onRetry,
}) => {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-red-100 bg-red-50/50 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-500">
        <AlertTriangle size={22} />
      </div>

      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        <p className="mt-1 text-sm text-gray-500">{message}</p>
      </div>

      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
};

export default ErrorState;
