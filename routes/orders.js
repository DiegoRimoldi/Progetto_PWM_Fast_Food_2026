const express = require("express");
const { ObjectId } = require("mongodb");
const authenticateUser = require("../middleware/authenticateUser");
const authorizeRistoratore = require("../middleware/authorizeRistoratore");

const ordersRouter = express.Router();
const validStates = ["ordinato", "in preparazione", "in consegna", "consegnato"];

function formatRomeDate() {
  return new Date().toLocaleString("it-IT", { timeZone: "Europe/Rome", hour12: false }).replace(",", " -");
}

ordersRouter.post("/", authenticateUser, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const user = req.user;

    if (user.role !== "cliente") return res.status(403).json({ error: "Solo i clienti possono creare ordini" });

    const { meals, metodo_consegna, distanza_km } = req.body;
    if (!Array.isArray(meals) || meals.length === 0) return res.status(400).json({ error: "meals deve essere un array non vuoto" });

    const ordiniPerRistoranti = {};
    for (const m of meals) {
      if (!m.ristorante_id || !ObjectId.isValid(m.ristorante_id)) {
        return res.status(400).json({ error: `ristorante_id mancante o non valido per il piatto: ${m.nome || "sconosciuto"}` });
      }
      const rid = m.ristorante_id;
      ordiniPerRistoranti[rid] = ordiniPerRistoranti[rid] || [];
      ordiniPerRistoranti[rid].push({
        _id: new ObjectId(m._id),
        nome: m.nome,
        quantita: m.quantita,
        prezzo_unitario: m.prezzo_unitario,
        tempo_preparazione: m.tempo_preparazione || 10
      });
    }

    const utente = await db.collection("users").findOne({ _id: new ObjectId(user._id) });
    const createdIds = [];

    for (const ristoranteId of Object.keys(ordiniPerRistoranti)) {
      let totale = 0;
      let tempoAttesa = 0;

      ordiniPerRistoranti[ristoranteId].forEach((meal) => {
        totale += meal.quantita * meal.prezzo_unitario;
        tempoAttesa += meal.quantita * meal.tempo_preparazione;
      });

      const ordiniRistorante = await db.collection("orders")
        .find({ ristorante_id: new ObjectId(ristoranteId), stato: { $ne: "consegnato" } })
        .toArray();

      const stato = ordiniRistorante.length === 0 ? "in preparazione" : "ordinato";

      ordiniRistorante.forEach((o) => {
        if (["in preparazione", "ordinato"].includes(o.stato)) tempoAttesa += o.tempo_attesa || 0;
      });

      let costo_consegna = 0;
      if (metodo_consegna === "consegna a domicilio") {
        const km = Number(distanza_km || 0);
        if (Number.isNaN(km) || km < 0) return res.status(400).json({ error: "distanza_km non valida" });
        costo_consegna = Number((km * 1.2).toFixed(2));
        totale += costo_consegna;
      }

      const newOrder = {
        cliente_id: new ObjectId(utente._id),
        cliente_nome: utente.username,
        ristorante_id: new ObjectId(ristoranteId),
        meals: ordiniPerRistoranti[ristoranteId],
        totale,
        costo_consegna,
        stato,
        data_ordine: formatRomeDate(),
        metodo_consegna,
        tempo_attesa: tempoAttesa
      };

      const inserted = await db.collection("orders").insertOne(newOrder);
      createdIds.push(inserted.insertedId);
    }

    res.status(201).json({ message: "Ordini creati con successo.", orderIds: createdIds });
  } catch (err) {
    res.status(500).json({ error: "Errore nella creazione dell'ordine" });
  }
});

ordersRouter.put("/:id", authenticateUser, authorizeRistoratore, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const id = req.params.id;

    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "ID ordine non valido" });

    const ristorante = await db.collection("restaurants").findOne({ ristoratore_id: new ObjectId(req.user._id) });
    if (!ristorante) return res.status(404).json({ error: "Ristorante non trovato" });

    const order = await db.collection("orders").findOne({ _id: new ObjectId(id) });
    if (!order) return res.status(404).json({ error: "Ordine non trovato" });
    if (order.ristorante_id.toString() !== ristorante._id.toString()) {
      return res.status(403).json({ error: "Non puoi modificare ordini di altri ristoranti" });
    }

    const currentStateIndex = validStates.indexOf(order.stato);
    if (currentStateIndex === -1) return res.status(400).json({ error: "Stato ordine non valido" });

    if (order.metodo_consegna === "Ritiro in ristorante") {
      if (currentStateIndex === 3) return res.status(400).json({ error: "Ordine già consegnato" });
      const nuovoStato = currentStateIndex === 1 ? validStates[currentStateIndex + 2] : validStates[currentStateIndex + 1];
      await db.collection("orders").updateOne({ _id: new ObjectId(id) }, { $set: { stato: nuovoStato } });
    } else {
      if (currentStateIndex >= 2) return res.status(400).json({ error: "Solo il cliente può confermare la ricezione" });
      const nuovoStato = validStates[currentStateIndex + 1];
      await db.collection("orders").updateOne({ _id: new ObjectId(id) }, { $set: { stato: nuovoStato } });
    }

    res.json({ message: "Stato ordine aggiornato correttamente." });
  } catch (err) {
    res.status(500).json({ error: "Errore nell'aggiornamento ordine" });
  }
});

ordersRouter.get("/", authenticateUser, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const user = req.user;
    let filter = {};

    if (user.role === "cliente") {
      filter.cliente_id = new ObjectId(user._id);
    } else if (user.role === "ristoratore") {
      const ristorante = await db.collection("restaurants").findOne({ ristoratore_id: new ObjectId(user._id) });
      if (!ristorante) return res.status(404).json({ error: "Ristorante non trovato" });
      filter.ristorante_id = new ObjectId(ristorante._id);
    } else {
      return res.status(403).json({ error: "Accesso negato" });
    }

    const orders = await db.collection("orders").find(filter).toArray();

    for (const order of orders) {
      const ristorante = await db.collection("restaurants").findOne({ _id: order.ristorante_id });
      order.ristorante_nome = ristorante ? ristorante.name : "Ristorante sconosciuto";
    }

    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: "Errore nel recupero ordini" });
  }
});

ordersRouter.get("/:id", authenticateUser, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const user = req.user;
    const id = req.params.id;

    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "ID ordine non valido" });

    const order = await db.collection("orders").findOne({ _id: new ObjectId(id) });
    if (!order) return res.status(404).json({ error: "Ordine non trovato" });

    if (user.role === "cliente" && order.cliente_id.toString() !== user._id) {
      return res.status(403).json({ error: "Accesso negato all'ordine" });
    }

    if (user.role === "ristoratore") {
      const ristorante = await db.collection("restaurants").findOne({ ristoratore_id: new ObjectId(user._id) });
      if (!ristorante || order.ristorante_id.toString() !== ristorante._id.toString()) {
        return res.status(403).json({ error: "Accesso negato all'ordine" });
      }
    }

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: "Errore nel recupero ordine" });
  }
});

ordersRouter.put("/:id/consegna", authenticateUser, async (req, res) => {
  try {
    const db = req.app.locals.db;
    const id = req.params.id;

    if (!ObjectId.isValid(id)) return res.status(400).json({ error: "ID ordine non valido" });
    if (req.user.role !== "cliente") return res.status(403).json({ error: "Solo i clienti possono confermare la consegna" });

    const order = await db.collection("orders").findOne({ _id: new ObjectId(id) });
    if (!order) return res.status(404).json({ error: "Ordine non trovato" });
    if (order.cliente_id.toString() !== req.user._id) return res.status(403).json({ error: "Non puoi modificare ordini di altri clienti" });
    if (order.stato !== "in consegna") return res.status(400).json({ error: "Puoi confermare la consegna solo se l'ordine è in consegna" });

    const result = await db.collection("orders").findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { stato: "consegnato" } },
      { returnDocument: "after" }
    );

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: "Errore nella conferma consegna" });
  }
});

module.exports = ordersRouter;
