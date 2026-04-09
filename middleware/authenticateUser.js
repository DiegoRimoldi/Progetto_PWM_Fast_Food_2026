const jwt = require("jsonwebtoken");

const authenticateUser = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Token mancante o formato non valido" });
    }

    const token = authHeader.split(" ")[1];
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload.userId || !payload.role) {
      return res.status(401).json({ error: "Token non valido: mancano dati utente" });
    }

    req.user = { _id: payload.userId, userId: payload.userId, role: payload.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token non valido o scaduto" });
  }
};

module.exports = authenticateUser;
