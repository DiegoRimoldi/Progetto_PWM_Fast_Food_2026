const AppError = require("../utils/AppError");

module.exports = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    return next(new AppError(
      error.details.map(e => e.message).join(", "),
      400
    ));
  }

  next();
};
