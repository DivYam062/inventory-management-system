// Backend errors come back either as a plain string message or, for Mongoose
// validation failures, an array of field messages (see errorMiddleware.js).
export const getErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again."
) => {
  const message = error?.response?.data?.message;

  if (Array.isArray(message)) return message.join(", ");
  return message || fallback;
};
