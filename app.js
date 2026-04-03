// app.js
const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurazione Middleware
app.use(cors());
app.use(express.json());

// Connessione a MongoDB
mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/fastfood")
  .then(() => console.log("✅ MongoDB connesso"))
  .catch(err => console.error("❌ Errore MongoDB:", err));

/* =======================
   MODELLI (SCHEMI)
======================= */

const userSchema = new mongoose.Schema({
  nome: String,
  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  ruolo: { type: String, enum: ['cliente', 'ristoratore'], default: 'cliente' }
});

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: String,
  image: String,
  description: String,
  ristoratore_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

const mealSchema = new mongoose.Schema({
  strMeal: { type: String, required: true },
  strCategory: String,
  strArea: String,
  prezzo: { type: Number, required: true },
  tempo_preparazione: Number,
  ingredients: [String],
  measures: [String],
  strMealThumb: String,
  strInstructions: String,
  ristorante_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true }
});

const orderSchema = new mongoose.Schema({
  cliente_nome: String,
  totale: Number,
  stato: { 
    type: String, 
    enum: ['ordinato', 'in preparazione', 'in consegna', 'consegnato', 'annullato'], 
    default: 'ordinato' 
  },
  tempo_attesa: Number,
  metodo_consegna: String,
  data_ordine: { type: Date, default: Date.now },
  ristorante_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
  meals: [{
    nome: String,
    quantita: Number
  }]
});

const User = mongoose.model('User', userSchema);
const Restaurant = mongoose.model('Restaurant', restaurantSchema);
const Meal = mongoose.model('Meal', mealSchema);
const Order = mongoose.model('Order', orderSchema);

/* =======================
   MIDDLEWARE DI AUTENTICAZIONE
======================= */

const verificaToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: "Accesso negato, token mancante" });

  jwt.verify(token, process.env.JWT_SECRET || "segreto_super_sicuro", (err, user) => {
    if (err) return res.status(403).json({ error: "Token non valido o scaduto" });
    req.user = user;
    next();
  });
};

/* =======================
   ROTTE AUTENTICAZIONE
======================= */

app.post("/auth/register", async (req, res) => {
  try {
    const { nome, email, password, ruolo } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const nuovoUtente = new User({ nome, email, password: hashedPassword, ruolo });
    await nuovoUtente.save();
    res.status(201).json({ message: "Utente registrato con successo" });
  } catch (err) {
    res.status(500).json({ error: "Errore durante la registrazione" });
  }
});

app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const utente = await User.findOne({ email });
    if (!utente || !(await bcrypt.compare(password, utente.password))) {
      return res.status(401).json({ error: "Credenziali non valide" });
    }
    const token = jwt.sign(
      { id: utente._id, ruolo: utente.ruolo }, 
      process.env.JWT_SECRET || "segreto_super_sicuro", 
      { expiresIn: '24h' }
    );
    res.json({ token, userId: utente._id, role: utente.ruolo, nome: utente.nome });
  } catch (err) {
    res.status(500).json({ error: "Errore durante il login" });
  }
});

/* =======================
   ROTTE RISTORANTI
   Nota: manteniamo /restaurants/search (che ritorna { restaurants: [...] })
         e aggiungiamo /restaurants che ritorna direttamente l'array per compatibilità client.
======================= */

// Cerca e recupera ristoranti (risposta: { restaurants: [...] })
app.get("/restaurants/search", verificaToken, async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    res.json({ restaurants });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rotta compatibile che restituisce direttamente l'array (utile per client che si aspettano un array)
app.get("/restaurants", verificaToken, async (req, res) => {
  try {
    const restaurants = await Restaurant.find();
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Crea un ristorante
app.post("/restaurants", verificaToken, async (req, res) => {
  try {
    if (req.user.ruolo !== 'ristoratore') {
      return res.status(403).json({ error: "Accesso negato. Solo i ristoratori possono creare ristoranti." });
    }
    const { name, address, description, image } = req.body;
    const nuovoRistorante = new Restaurant({
      name, address, description, image, ristoratore_id: req.user.id
    });
    await nuovoRistorante.save();
    res.status(201).json(nuovoRistorante);
  } catch (err) {
    res.status(500).json({ error: "Errore nel salvataggio del ristorante" });
  }
});

// Aggiorna ristorante esistente
app.put("/restaurants/:id", verificaToken, async (req, res) => {
  try {
    const { name, address, image, description } = req.body;
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) return res.status(404).json({ error: "Ristorante non trovato" });
    if (restaurant.ristoratore_id.toString() !== req.user.id) {
      return res.status(403).json({ error: "Non sei autorizzato a modificare questo ristorante" });
    }

    restaurant.name = name;
    restaurant.address = address;
    restaurant.image = image;
    restaurant.description = description;

    await restaurant.save();
    res.json({ message: "Ristorante aggiornato!", restaurant });
  } catch (err) {
    res.status(500).json({ error: "Errore durante l'aggiornamento" });
  }
});

// Elimina ristorante
app.delete("/restaurants/:id", verificaToken, async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);

    if (!restaurant) return res.status(404).json({ error: "Ristorante non trovato" });
    if (restaurant.ristoratore_id.toString() !== req.user.id) {
      return res.status(403).json({ error: "Non autorizzato a eliminare questo ristorante" });
    }

    await Restaurant.findByIdAndDelete(req.params.id);
    res.json({ message: "Ristorante eliminato con successo!" });
  } catch (err) {
    res.status(500).json({ error: "Errore durante l'eliminazione" });
  }
});

/* =======================
   ROTTE PIATTI (MEALS)
======================= */

// Recupera tutti i piatti
app.get("/meals", verificaToken, async (req, res) => {
  try {
    const meals = await Meal.find();
    res.json(meals);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recupera singolo piatto
app.get("/meals/:id", verificaToken, async (req, res) => {
  try {
    const meal = await Meal.findById(req.params.id);
    if (!meal) return res.status(404).json({ error: "Piatto non trovato" });
    res.json(meal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Aggiungi un piatto (richiede ristorante_id nel payload)
app.post("/meals", verificaToken, async (req, res) => {
  try {
    // Validazione minima: ristorante_id presente
    if (!req.body.ristorante_id) {
      return res.status(400).json({ error: "Campo ristorante_id mancante" });
    }

    // Controllo che il ristorante esista e appartenga al ristoratore (opzionale ma consigliato)
    const ristorante = await Restaurant.findById(req.body.ristorante_id);
    if (!ristorante) {
      return res.status(404).json({ error: "Ristorante non trovato" });
    }
    // Se l'utente è ristoratore, assicurarsi che stia aggiungendo al proprio ristorante
    if (req.user.ruolo === 'ristoratore' && ristorante.ristoratore_id.toString() !== req.user.id) {
      return res.status(403).json({ error: "Non sei autorizzato ad aggiungere piatti a questo ristorante" });
    }

    const nuovoPiatto = new Meal(req.body);
    await nuovoPiatto.save();
    res.status(201).json(nuovoPiatto);
  } catch (err) {
    res.status(500).json({ error: "Errore nel caricamento del piatto" });
  }
});

// Modifica un piatto
app.put("/meals/:id", verificaToken, async (req, res) => {
  try {
    const meal = await Meal.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!meal) return res.status(404).json({ error: "Piatto non trovato" });
    res.json(meal);
  } catch (err) {
    res.status(500).json({ error: "Errore durante la modifica del piatto" });
  }
});

/* =======================
   ROTTE ORDINI
======================= */

// Recupera tutti gli ordini dal più recente al più vecchio
app.get("/orders", verificaToken, async (req, res) => {
  try {
    // In un'app reale: await Order.find({ ristorante_id: ID_DEL_TUO_RISTORANTE })
    const orders = await Order.find().sort({ data_ordine: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Errore nel recupero degli ordini" });
  }
});

// Avanza stato dell'ordine
app.put("/orders/:id", verificaToken, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ error: "Ordine non trovato" });

    // Logica di avanzamento stato
    if (order.stato === "ordinato") {
      order.stato = "in preparazione";
    } else if (order.stato === "in preparazione") {
      order.stato = "in consegna";
    } else if (order.stato === "in consegna") {
      order.stato = "consegnato";
    }

    await order.save();
    res.json({ message: "Stato ordine aggiornato", order });
  } catch (err) {
    res.status(500).json({ error: "Errore durante l'aggiornamento dell'ordine" });
  }
});

// SEED: Genera ordini di test (Visita /orders/seed dal browser per popolare il DB)
app.get("/orders/seed", async (req, res) => {
  try {
    await Order.deleteMany();
    await Order.insertMany([
      {
        cliente_nome: "Mario Rossi",
        totale: 25.50,
        stato: "ordinato",
        tempo_attesa: 20,
        metodo_consegna: "Asporto",
        meals: [{ nome: "Pizza Margherita", quantita: 2 }, { nome: "Patatine", quantita: 1 }]
      },
      {
        cliente_nome: "Luigi Bianchi",
        totale: 18.00,
        stato: "in preparazione",
        tempo_attesa: 10,
        metodo_consegna: "Domicilio",
        meals: [{ nome: "Cheeseburger", quantita: 1 }, { nome: "Coca Cola", quantita: 2 }]
      }
    ]);
    res.send("✅ Ordini di test generati nel database!");
  } catch (err) {
    res.status(500).send("❌ Errore nella generazione degli ordini.");
  }
});

/* =======================
   AVVIO SERVER
======================= */

app.listen(PORT, () => {
  console.log(`🚀 Server in esecuzione su http://localhost:${PORT}`);
});
