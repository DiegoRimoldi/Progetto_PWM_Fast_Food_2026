const r = require("express").Router();
const c = require("../controllers/authController");
const v = require("../validators/authValidator");
const validate = require("../middleware/validate");

r.post("/register", validate(v.register), c.register);
r.post("/login", validate(v.login), c.login);

module.exports = r;
