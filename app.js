const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const swaggerUi = require('swagger-ui-express');
const generateSwagger = require('./swagger');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

//
// 🔹 GENERA SWAGGER PRIMA DI AVVIARE IL SERVER
//
generateSwagger().then(() => {

  const swaggerFile = require('./swagger.json');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerFile));

  //
  // 🔹 CONNESSIONE MONGODB
  //
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ Connesso a MongoDB Atlas!"))
    .catch(err => console.error("❌ Errore MongoDB:", err));

  //
  // 🔹 SCHEMA UTENTE
  //
  const userSchema = new mongoose.Schema({
    nome: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    ruolo: { type: String, enum: ['cliente', 'ristoratore'], default: 'cliente' },
    numero_di_telefono: String,
    indirizzo: String,
    metodo_pagamento: String,
    piva: String
  });

  const User = mongoose.model('User', userSchema);

  //
  // 🔐 REGISTER
  //
  app.post("/auth/register", async (req, res) => {
    try {
      const userData = req.body;

      if (userData._id === "string" || !userData._id) {
        delete userData._id;
      }

      const salt = await bcrypt.genSalt(10);
      userData.password = await bcrypt.hash(userData.password, salt);

      const newUser = new User(userData);
      await newUser.save();

      console.log("✅ Utente registrato:", newUser.email);

      res.status(201).json({
        message: "Utente creato con successo"
      });

    } catch (error) {
      res.status(400).json({
        error: "Errore registrazione",
        details: error.message
      });
    }
  });

  //
  // 🔑 LOGIN
  //
  app.post("/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: "Email e password obbligatorie"
        });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(401).json({
          error: "Credenziali non valide"
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          error: "Credenziali non valide"
        });
      }

      const token = jwt.sign(
        {
          id: user._id,
          ruolo: user.ruolo
        },
        process.env.JWT_SECRET || "supersegreto",
        { expiresIn: "1h" }
      );

      res.json({
        message: "Login effettuato",
        token,
        user: {
          id: user._id,
          nome: user.nome,
          email: user.email,
          ruolo: user.ruolo
        }
      });

    } catch (error) {
      console.error(error);
      res.status(500).json({
        error: "Errore server"
      });
    }
  });

  //
  // 🔹 TEST
  //
  app.get("/", (req, res) => {
    res.send("Server attivo!");
  });

  //
  // 🚀 START SERVER
  //
  app.listen(PORT, () => {
    console.log(`🚀 Server: http://localhost:${PORT}`);
    console.log(`📖 Swagger: http://localhost:${PORT}/api-docs`);
  });

});
