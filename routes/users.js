const express = require("express");
const { ObjectId } = require("mongodb");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const authenticateUser = require("../middleware/authenticateUser");

const usersRouter = express.Router();

usersRouter.post("/register", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const {
      username,
      email,
      password,
      numero_di_telefono,
      indirizzo = "",
      metodo_pagamento = "",
      piva = "",
      role
    } = req.body;

    if (!username || !email || !password || !numero_di_telefono) {
      return res.status(400).json({ error: "username, email, password e numero di telefono sono obbligatori" });
    }

    if (!role || !["cliente", "ristoratore"].includes(role)) {
      return res.status(400).json({ error: "Ruolo non valido" });
    }

    if (role === "cliente" && (!indirizzo || !metodo_pagamento)) {
      return res.status(400).json({ error: "Indirizzo e metodo di pagamento sono obbligatori" });
    }

    if (role === "ristoratore" && !piva) {
      return res.status(400).json({ error: "Partita IVA obbligatoria" });
    }

    const userExists = await db.collection("users").findOne({ $or: [{ username }, { email }] });
    if (userExists) {
      return res.status(409).json({ error: "Username o email già in uso" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      username,
      email,
      password: hashedPassword,
      numero_di_telefono,
      role,
      indirizzo: role === "cliente" ? indirizzo : undefined,
      metodo_pagamento: role === "cliente" ? metodo_pagamento : undefined,
      piva: role === "ristoratore" ? piva : undefined,
      createdAt: new Date()
    };

    Object.keys(newUser).forEach((k) => newUser[k] === undefined && delete newUser[k]);

    const result = await db.collection("users").insertOne(newUser);
    res.status(201).json({ message: "Utente registrato con successo", userId: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: "Errore nella registrazione" });
  }
});

usersRouter.post("/login", async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { username, email, password } = req.body;

    if ((!username && !email) || !password) {
      return res.status(400).json({ error: "username/email e password sono obbligatori" });
    }

    const query = username ? { username } : { email };
    const user = await db.collection("users").findOne(query);

    if (!user) return res.status(401).json({ error: "Credenziali non valide" });

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) return res.status(401).json({ error: "Credenziali non valide" });

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    res.json({ token, role: user.role, userId: user._id });
  } catch (err) {
    res.status(500).json({ error: "Errore nel login" });
  }
});

usersRouter.get("/me", authenticateUser, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(req.user._id) },
      { projection: { password: 0 } }
    );

    if (!user) return res.status(404).json({ error: "Utente non trovato" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Errore nel recupero utente" });
  }
});

usersRouter.put("/me", authenticateUser, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const userId = req.user._id;

    if (req.body.email || req.body.username) {
      const query = { $or: [], _id: { $ne: new ObjectId(userId) } };
      if (req.body.email) query.$or.push({ email: req.body.email });
      if (req.body.username) query.$or.push({ username: req.body.username });

      if (query.$or.length > 0) {
        const exists = await db.collection("users").findOne(query);
        if (exists) return res.status(409).json({ error: "Username o email già in uso" });
      }
    }

    const fields = { ...req.body };
    delete fields.password;
    delete fields.role;

    const result = await db.collection("users").findOneAndUpdate(
      { _id: new ObjectId(userId) },
      { $set: fields },
      { returnDocument: "after", projection: { password: 0 } }
    );

    if (!result) return res.status(404).json({ error: "Utente non trovato" });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Errore aggiornamento utente" });
  }
});

usersRouter.put("/me/password", authenticateUser, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Parametri mancanti" });
    }

    const user = await db.collection("users").findOne({ _id: new ObjectId(req.user._id) });
    if (!user) return res.status(404).json({ error: "Utente non trovato" });

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(400).json({ error: "Vecchia password errata" });

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await db.collection("users").updateOne(
      { _id: new ObjectId(req.user._id) },
      { $set: { password: hashedNewPassword } }
    );

    res.json({ message: "Password aggiornata" });
  } catch (err) {
    res.status(500).json({ error: "Errore aggiornamento password" });
  }
});

usersRouter.delete("/:id", authenticateUser, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const userId = req.params.id;

    if (!ObjectId.isValid(userId)) return res.status(400).json({ error: "ID non valido" });
    if (req.user._id !== userId) return res.status(403).json({ error: "Non autorizzato" });

    await db.collection("users").deleteOne({ _id: new ObjectId(userId) });
    await db.collection("carts").deleteOne({ user_id: new ObjectId(userId) });

    res.json({ message: "Utente eliminato" });
  } catch (err) {
    res.status(500).json({ error: "Errore eliminazione" });
  }
});

module.exports = usersRouter;
