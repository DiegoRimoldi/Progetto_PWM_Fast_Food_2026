const User = require("../models/User");
const AppError = require("../utils/AppError");

exports.getAll = () => User.find();

exports.getById = async (id) => {
  const u = await User.findById(id);
  if (!u) throw new AppError("Not found", 404);
  return u;
};

exports.create = (data) => User.create(data);

exports.update = async (id, data) => {
  const u = await User.findByIdAndUpdate(id, data, { new: true });
  if (!u) throw new AppError("Not found", 404);
  return u;
};

exports.delete = async (id) => {
  const u = await User.findByIdAndDelete(id);
  if (!u) throw new AppError("Not found", 404);
};
