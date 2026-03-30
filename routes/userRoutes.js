const r = require("express").Router();
const c = require("../controllers/userController");
const auth = require("../middleware/auth");

r.get("/", auth, c.getAll);
r.get("/:id", auth, c.getOne);
r.post("/", c.create);
r.put("/:id", auth, c.update);
r.delete("/:id", auth, c.delete);

module.exports = r;
