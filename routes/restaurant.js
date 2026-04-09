const express = require("express");
const { ObjectId } = require("mongodb");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRistoratore = require("../middleware/authorizeRistoratore");

const router = express.Router();

router.get("/search", async (req, res) => {
  const db = req.app.locals.db;
  const { q, address, meal } = req.query;
  const filter = {};

  if (q) filter.name = { $regex: q, $options: "i" };
  if (address) filter.address = { $regex: address, $options: "i" };

  try {
    let restaurants = await db.collection("restaurants").find(filter).toArray();

    if (meal) {
      const meals = await db.collection("meals").find({ strMeal: { $regex: meal, $options: "i" } }).toArray();
      const rIds = new Set(meals.filter((m) => m.ristorante_id).map((m) => m.ristorante_id.toString()));
      restaurants = restaurants.filter((r) => rIds.has(r._id.toString()));
    }

    res.json({ total: restaurants.length, restaurants });
  } catch (err) {
    res.status(500).json({ error: "Errore nella ricerca ristoranti" });
  }
});

router.get("/", async (req, res) => {
  const db = req.app.locals.db;
  try {
    const restaurants = await db.collection("restaurants").find({}).toArray();
    res.json(restaurants);
  } catch (err) {
    res.status(500).json({ error: "Errore nel recupero dei ristoranti" });
  }
});

router.get("/statistics", authenticateUser, authorizeRistoratore, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const ristorante = await db.collection("restaurants").findOne({ ristoratore_id: new ObjectId(req.user._id) });
    if (!ristorante) return res.status(404).json({ error: "Ristorante non trovato" });

    const orders = await db.collection("orders").find({ ristorante_id: new ObjectId(ristorante._id) }).toArray();

    let totalRevenue = 0;
    const ordersByState = {};
    const mealCount = {};
    const ordersTrend = {};

    orders.forEach(({ totale = 0, stato, meals = [], data_ordine }) => {
      totalRevenue += totale;
      ordersByState[stato] = (ordersByState[stato] || 0) + 1;
      meals.forEach(({ nome, quantita }) => { mealCount[nome] = (mealCount[nome] || 0) + quantita; });
      const date = typeof data_ordine === "string" ? data_ordine.split(" - ")[0] : new Date().toISOString().slice(0, 10);
      ordersTrend[date] = (ordersTrend[date] || 0) + 1;
    });

    res.json({
      totalOrders: orders.length,
      totalRevenue,
      ordersByState,
      topMeals: Object.entries(mealCount).sort((a, b) => b[1] - a[1]).slice(0, 5),
      ordersTrend
    });
  } catch (err) {
    res.status(500).json({ error: "Errore nel recupero delle statistiche" });
  }
});

router.get("/:restaurantId", async (req, res) => {
  const db = req.app.locals.db;
  const restaurantId = req.params.restaurantId;

  if (!ObjectId.isValid(restaurantId)) return res.status(400).json({ error: "ID ristorante non valido" });

  try {
    const restaurant = await db.collection("restaurants").findOne({ _id: new ObjectId(restaurantId) });
    if (!restaurant) return res.status(404).json({ error: "Ristorante non trovato" });

    const mealIds = Array.isArray(restaurant.menu)
      ? restaurant.menu.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id))
      : [];

    const meals = mealIds.length ? await db.collection("meals").find({ _id: { $in: mealIds } }).toArray() : [];
    res.json({ ...restaurant, meals });
  } catch (err) {
    res.status(500).json({ error: "Errore nel recupero del ristorante" });
  }
});

router.post("/", authenticateUser, authorizeRistoratore, async (req, res) => {
  const db = req.app.locals.db;
  const { name, address, menu = [], description, image } = req.body;

  if (!name || !address) return res.status(400).json({ error: "Nome e indirizzo sono obbligatori" });

  try {
    const existingRestaurant = await db.collection("restaurants").findOne({ ristoratore_id: new ObjectId(req.user._id) });
    if (existingRestaurant) return res.status(400).json({ error: "Hai già un ristorante associato" });

    const newRestaurant = { name, address, description, image, menu, ristoratore_id: new ObjectId(req.user._id) };
    const result = await db.collection("restaurants").insertOne(newRestaurant);
    res.status(201).json({ ...newRestaurant, _id: result.insertedId });
  } catch (err) {
    res.status(500).json({ error: "Errore nella creazione del ristorante" });
  }
});

router.put("/:restaurantId", authenticateUser, authorizeRistoratore, async (req, res) => {
  const db = req.app.locals.db;
  const restaurantId = req.params.restaurantId;
  if (!ObjectId.isValid(restaurantId)) return res.status(400).json({ error: "ID ristorante non valido" });

  try {
    const restaurant = await db.collection("restaurants").findOne({ _id: new ObjectId(restaurantId) });
    if (!restaurant) return res.status(404).json({ error: "Ristorante non trovato" });
    if (restaurant.ristoratore_id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Accesso negato: non proprietario del ristorante" });
    }

    const updateDoc = {};
    ["name", "address", "menu", "description", "image"].forEach((key) => {
      if (req.body[key] !== undefined) updateDoc[key] = req.body[key];
    });

    await db.collection("restaurants").updateOne({ _id: new ObjectId(restaurantId) }, { $set: updateDoc });
    const updatedRestaurant = await db.collection("restaurants").findOne({ _id: new ObjectId(restaurantId) });
    res.json(updatedRestaurant);
  } catch (err) {
    res.status(500).json({ error: "Errore nella modifica del ristorante" });
  }
});

router.delete("/:restaurantId", authenticateUser, authorizeRistoratore, async (req, res) => {
  const db = req.app.locals.db;
  const restaurantId = req.params.restaurantId;
  if (!ObjectId.isValid(restaurantId)) return res.status(400).json({ error: "ID ristorante non valido" });

  try {
    const restaurant = await db.collection("restaurants").findOne({
      _id: new ObjectId(restaurantId),
      ristoratore_id: new ObjectId(req.user._id)
    });

    if (!restaurant) return res.status(403).json({ error: "Non puoi eliminare un ristorante che non ti appartiene" });

    await db.collection("meals").deleteMany({ ristorante_id: new ObjectId(restaurantId) });
    await db.collection("orders").deleteMany({ ristorante_id: new ObjectId(restaurantId) });
    await db.collection("restaurants").deleteOne({ _id: new ObjectId(restaurantId) });

    res.json({ message: "Ristorante, piatti e ordini eliminati correttamente." });
  } catch (err) {
    res.status(500).json({ error: "Errore nella cancellazione del ristorante" });
  }
});

module.exports = router;
