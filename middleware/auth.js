const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

module.exports = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) return next(new AppError("Access denied", 401));

  try {
    const decoded = jwt.verify(token.replace("Bearer ", ""), "secret");
    req.user = decoded;
    next();
  } catch {
    next(new AppError("Invalid token", 400));
  }
};
