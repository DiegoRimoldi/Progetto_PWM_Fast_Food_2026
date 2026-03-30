const service = require("../services/userService");
const asyncHandler = require("../utils/asyncHandler");

exports.getAll = asyncHandler(async (req, res) => {
  res.json(await service.getAll());
});

exports.getOne = asyncHandler(async (req, res) => {
  res.json(await service.getById(req.params.id));
});

exports.create = asyncHandler(async (req, res) => {
  res.status(201).json(await service.create(req.body));
});

exports.update = asyncHandler(async (req, res) => {
  res.json(await service.update(req.params.id, req.body));
});

exports.delete = asyncHandler(async (req, res) => {
  await service.delete(req.params.id);
  res.json({ message: "Deleted" });
});
