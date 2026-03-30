const User = require("../models/User");
const jwt = require("jsonwebtoken");
const AppError = require("../utils/AppError");

exports.register = async (data) => {
  const user = await User.create(data);

  const token = jwt.sign({ id: user._id }, "secret", { expiresIn: "1d" });

  return { user, token };
};

exports.login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) throw new AppError("User not found", 404);

  const ok = await user.comparePassword(password);
  if (!ok) throw new AppError("Invalid credentials", 400);

  const token = jwt.sign({ id: user._id }, "secret", { expiresIn: "1d" });

  return { user, token };
};
