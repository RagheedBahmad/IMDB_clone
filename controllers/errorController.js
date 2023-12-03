const AppError = require("./../utils/appError");
const authController = require("./../controllers/authController");

// const handleCastErrorDB = (err) => {
//   const message = `Invalid ${err.path}: ${err.value}..`;
//   return new AppError(message, 400);
// };
//
// const handleDuplicateFieldsDB = (err) => {
//   const value = err.keyValue.name;
//   const message = `Duplicate field value: ${value}. PLease use another value`;
//   return new AppError(message, 400);
// };
//
// const handleValidationErrorDB = (err) => {
//   const errors = Object.values(err.errors).map((el) => el.message);
//
//   const message = `Invalid input data, ${errors.join(". ")}`;
//   return new AppError(message, 400);
// };
//
// const handleMinLengthPasswordError = () => {
//   return new AppError("Password must be at least 8 characters long", 500);
// };
// const handleJWTError = () =>
//   new AppError("Invalid token. Please log in again.", 401);
//
// const handleJWTExpiredError = () => {
//   return new AppError("Expired token, Please login again", 401);
// };
// const sendErrorDev = (err, res) => {
//   res.status(err.statusCode).json({
//     status: err.status,
//     error: err,
//     message: err.message,
//     stack: err.stack,
//   });
// };
//
// const sendErrorProd = (err, res) => {
//   //Operational, trusted errors: send message to client
//   if (err.isOperational) {
//     res.status(err.statusCode).json({
//       status: err.status,
//       message: err.message,
//     });
//
//     //Programming or other unknown errors: don't send to client
//   } else {
//     // 1)Log error
//     console.error("ERROR", err);
//
//     //2) Send generic message
//     res.status(500).json({
//       status: "error",
//       message: "Something went very wrong",
//     });
//   }
// };

module.exports = (err, req, res, next) => {
  console.log(err);
  console.log(err.message);
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";

  // if (err.name === "CastError") err = handleCastErrorDB(err);
  // if (err.code === 11000) err = handleDuplicateFieldsDB(err);
  // if (err.errs?.password?.kind === "minlength")
  //   err = handleMinLengthPasswordError();
  // if (err._message === "Validation failed") err = handleValidationErrorDB(err);
  // if (err.name === "JsonWebTokenError") err = handleJWTError();
  // if (err.message === "Token invalid or expired") err = handleJWTExpiredError();
  res.status(err.statusCode).json({
    code: err.code,
    status: err.status,
    message: err.message,
    path: req.originalUrl,
  });
};
