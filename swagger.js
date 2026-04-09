const swaggerAutogen = require('swagger-autogen')();
const swaggerUi = require("swagger-ui-express");
const swaggerDocument = require("./swagger.json");

function setupSwagger(app) {

  const doc = {
    info: {
      title: 'Progetto PWM Fast-Food - Rimoldi Diego',
      description: 'Descrizione degli endpoint API REST per il progetto "Fast-Food" di Programmazione Web & Mobile, sviluppato nell’Anno Accademico 2025/2026 da Rimoldi Diego'
    },
    host: 'localhost:3000',
    schemes: ['http']
  };

  const outputFile = './swagger.json';
  const inputFiles = ['./app.js'];

  // Genera swagger.json
  swaggerAutogen(outputFile, inputFiles, doc);

  // Usa Swagger UI
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));
}

module.exports = setupSwagger;
