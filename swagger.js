import swaggerAutogen from 'swagger-autogen';

const doc = {
    info: {
      title: 'Progetto PWM Fast-Food - Rimoldi Diego',
      description: 'Descrizione degli endpoint API REST per il progetto "Fast-Food" di Programmazione Web & Mobile, sviluppato nell’Anno Accademico 2025/2026 da Rimoldi Diego'
    },
    host: 'localhost:3000'
  };

const outputFile = './swagger.json';
const inputFiles = ['./index.js'];

swaggerAutogen(outputFile,inputFiles, doc);