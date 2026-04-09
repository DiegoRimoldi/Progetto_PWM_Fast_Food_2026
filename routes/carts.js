const express = require("express");
const authenticateUser = require("../middleware/authenticateUser");
const { ObjectId } = require("mongodb");

const cartsRouter = express.Router();

cartsRouter.get("/me", authenticateUser, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const cart = await db.collection("carts").findOne({ user_id: new ObjectId(req.user._id) });

    if (!cart) return res.status(404).json({ error: "Carrello vuoto o non trovato." });
    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: "Errore nel recupero del carrello" });
  }
});

cartsRouter.put("/add", authenticateUser, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { meal_id, quantita = 1, prezzo_unitario, ristorante_id, nome } = req.body;

    if (!meal_id || !ObjectId.isValid(meal_id)) return res.status(400).json({ error: "_id del piatto non valido" });
    if (!ristorante_id || !ObjectId.isValid(ristorante_id)) return res.status(400).json({ error: "ristorante_id non valido" });

    let cart = await db.collection("carts").findOne({ user_id: new ObjectId(req.user._id) });
    if (!cart) cart = { user_id: new ObjectId(req.user._id), meals: [] };

    const mealIndex = cart.meals.findIndex(
      (m) => m._id.toString() === meal_id && m.ristorante_id.toString() === ristorante_id
    );

    if (mealIndex !== -1) {
      cart.meals[mealIndex].quantita += quantita;
    } else {
      cart.meals.push({
        _id: new ObjectId(meal_id),
        nome,
        quantita,
        prezzo_unitario,
        ristorante_id: new ObjectId(ristorante_id)
      });
    }

    await db.collection("carts").updateOne(
      { user_id: new ObjectId(req.user._id) },
      { $set: cart },
      { upsert: true }
    );

    res.json(cart);
  } catch (err) {
    res.status(500).json({ error: "Errore nell'aggiunta al carrello" });
  }
});

cartsRouter.put("/remove", authenticateUser, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const { meal_id } = req.body;

    if (!meal_id || !ObjectId.isValid(meal_id)) {
      return res.status(400).json({ error: "_id del piatto non valido" });
    }

    const cart = await db.collection("carts").findOne({ user_id: new ObjectId(req.user._id) });
    if (!cart || cart.meals.length === 0) return res.status(404).json({ error: "Carrello vuoto o non trovato" });

    cart.meals = cart.meals.filter((m) => m._id.toString() !== meal_id);

    if (cart.meals.length === 0) {
      await db.collection("carts").deleteOne({ user_id: new ObjectId(req.user._id) });
      return res.json({ message: "Carrello eliminato poiché vuoto." });
    }

    await db.collection("carts").updateOne(
      { user_id: new ObjectId(req.user._id) },
      { $set: { meals: cart.meals } }
    );
    return res.json(cart);
  } catch (err) {
    res.status(500).json({ error: "Errore nella rimozione dal carrello" });
  }
});

cartsRouter.delete("/me", authenticateUser, async (req, res) => {
  try {
    const db = req.app.locals.db;
    await db.collection("carts").deleteOne({ user_id: new ObjectId(req.user._id) });
    res.json({ message: "Carrello eliminato correttamente." });
  } catch (err) {
    res.status(500).json({ error: "Errore durante l'eliminazione del carrello" });
  }
});

module.exports = cartsRouter;
