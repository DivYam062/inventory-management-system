const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  console.log("Error:", err);

  if (err.name === "CastError") {
    const message = "Resource not found";
    error = { message, statusCode: 404 };
  }

  if (err.name === "ValidationError") {
    const message = Object.values(err.errors).map(val => val.message);
    error = { message, statusCode: 400 };
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `${field} already exists`;
    error = { message, statusCode: 400 };
  }

  if (err.name === "MulterError") {
    const message = err.code === "LIMIT_FILE_SIZE" ? "Image must be smaller than 5MB" : err.message;
    error = { message, statusCode: 400 };
  }

  if (err.name === "JsonWebTokenError") {
    const message = "Invalid token";
    error = { message, statusCode: 401 };
  }

  if (err.name === "TokenExpiredError") {
    const message = "Token expired";
    error = { message, statusCode: 401 };
  }

  // notFound() sets res.statusCode to 404 before forwarding; honour it instead of defaulting to 500.
  const statusCode = error.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);
  const message = error.message || "Internal server error";

  return res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

const notFound = (req, res, next) => {
  const error = new Error(`Not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

module.exports = {
  errorHandler,
  notFound,
};