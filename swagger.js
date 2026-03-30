const swaggerUi = require("swagger-ui-express");
const fs = require("fs");
const path = require("path");

// Carica swagger.json
const swaggerDocument = JSON.parse(
  fs.readFileSync(path.join(__dirname, "swagger.json"), "utf8")
);

// Configurazione JWT
const options = {
  swaggerOptions: {
    authAction: {
      JWT: {
        name: "JWT",
        schema: {
          type: "apiKey",
          in: "header",
          name: "Authorization",
          description: "Inserisci 'Bearer <token>'"
        },
        value: "Bearer "
      }
    }
  }
};

const setupSwagger = (app) => {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument, options));
};

module.exports = setupSwagger;
