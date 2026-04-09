const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const { MongoClient } = require("mongodb");
require("dotenv").config();

const setupSwagger = require("./swagger");
const usersRouter = require("./routes/users");
const mealsRouter = require("./routes/meals");
const restaurantsRouter = require("./routes/restaurant");
const cartsRouter = require("./routes/carts");
const ordersRouter = require("./routes/orders");

const app = express();
const port = Number(process.env.PORT || 3000);
const mongoUri = process.env.MONGO_URI;

if (!mongoUri) {
  throw new Error("MONGO_URI non configurata nel file .env");
}

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.static(path.join(__dirname, "public")));
setupSwagger(app);

app.get("/", (req, res) => {
  res.send("Server FastFood attivo");
});

app.use("/users", usersRouter);
app.use("/auth", usersRouter); // compatibilità frontend
app.use("/meals", mealsRouter);
app.use("/restaurants", restaurantsRouter);
app.use("/carts", cartsRouter);
app.use("/orders", ordersRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Errore interno del server" });
});

async function seedInitialMeals(db) {
  const mealsCollection = db.collection("meals");
  const count = await mealsCollection.countDocuments();
  if (count > 0) return;

  const mealsPath = path.join(__dirname, "Documenti", "meals 1.json");
  if (!fs.existsSync(mealsPath)) return;

  const raw = JSON.parse(fs.readFileSync(mealsPath, "utf8"));
  const meals = Array.isArray(raw) ? raw : raw.meals;
  if (!Array.isArray(meals) || meals.length === 0) return;

  const cleanMeals = meals.map(({ _id, ...rest }) => rest);
  await mealsCollection.insertMany(cleanMeals);
  console.log(`✅ Seed iniziale completato: ${cleanMeals.length} piatti caricati.`);
}

async function start() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  const dbName = process.env.DB_NAME || "fastfood";
  const db = client.db(dbName);

  app.locals.db = db;
  await seedInitialMeals(db);

  app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
    console.log(`📚 Swagger docs at http://localhost:${port}/api-docs`);
  });
}

start().catch((err) => {
  console.error("❌ Errore avvio server:", err);
  process.exit(1);
});
