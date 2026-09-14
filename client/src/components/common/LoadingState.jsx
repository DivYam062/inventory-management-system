import Spinner from "../ui/Spinner";

const LoadingState = ({ message = "Loading...", fullHeight = false }) => {
  return (
    <div
      className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${
        fullHeight ? "min-h-[60vh]" : ""
      }`}
    >
      <Spinner size="lg" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
};

export default LoadingState;
