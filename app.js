// app.js
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors'); // Necessario per GitHub Pages
const setupSwagger = require('./swagger'); // Carica la tua configurazione

const app = express();
const PORT = 3000;

// Middleware
app.use(cors()); // Permette richieste da altri domini
app.use(express.json()); // Permette di leggere i dati JSON inviati dal modulo

// Configurazione Swagger
setupSwagger(app);

require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(() => console.log("✅ Connesso a MongoDB Atlas correttamente!"))
  .catch(err => console.error("❌ Errore di connessione a MongoDB:", err));

// Definizione dello Schema Utente (per mappare i campi del tuo register.html)
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

// Rotta di Registrazione corretta
app.post("/auth/register", async (req, res) => {
  try {
    const userData = req.body;

    // FIX: Se Swagger invia "_id: string", lo eliminiamo per farlo generare a MongoDB
    if (userData._id === "string" || !userData._id) {
      delete userData._id;
    }

    const newUser = new User(userData);
    await newUser.save();
    
    console.log("✅ Nuovo utente registrato:", newUser.nome);
    res.status(201).json({ message: "Utente creato con successo!" });
  } catch (error) {
    console.error("❌ Errore durante il salvataggio:", error);
    res.status(400).json({ 
      error: "Errore nella creazione utente", 
      details: error.message 
    });
  }
});

// Rotta base di test
app.get("/", (req, res) => {
  res.send("Server attivo e connesso a MongoDB!");
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📖 Documentazione API: http://localhost:${PORT}/api-docs`);
});