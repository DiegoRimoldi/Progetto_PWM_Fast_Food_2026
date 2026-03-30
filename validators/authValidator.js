const Joi = require("joi");

exports.register = Joi.object({
  nome: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

exports.login = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});
