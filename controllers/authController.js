const service = require("../services/authService");
const asyncHandler = require("../utils/asyncHandler");

exports.register = asyncHandler(async (req, res) => {
  res.status(201).json(await service.register(req.body));
});

exports.login = asyncHandler(async (req, res) => {
  res.json(await service.login(req.body));
});
