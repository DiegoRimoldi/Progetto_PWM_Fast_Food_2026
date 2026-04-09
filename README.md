# FastFood - Progetto PWM A.A. 2025/2026

Applicazione web per la gestione di ordini fast food con ruoli **cliente** e **ristoratore**, backend REST su **Node.js + MongoDB** e frontend statico HTML/CSS/JS.

## Requisiti

- Node.js 18+
- MongoDB (locale o Atlas)

## Configurazione

1. Copia `.env.example` in `.env` (se non presente, crea `.env`).
2. Imposta almeno:

```env
PORT=3000
MONGO_URI=mongodb://127.0.0.1:27017
DB_NAME=fastfood
JWT_SECRET=una_chiave_sicura
JWT_EXPIRES_IN=1d
```

## Avvio

```bash
npm install
npm start
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api-docs`

## Dataset iniziale

All'avvio, se la collection `meals` è vuota, viene caricato automaticamente il dataset da:

- `Documenti/meals 1.json`

## Copertura consegna (mappa requisiti -> API)

### 1) Profilo utente

- Registrazione/login (cliente o ristoratore): `POST /users/register`, `POST /users/login`
- Profilo corrente: `GET /users/me`
- Modifica dati: `PUT /users/me`
- Cambio password: `PUT /users/me/password`
- Cancellazione profilo: `DELETE /users/:id`

### 2) Gestione ristorante

- Creazione ristorante: `POST /restaurants`
- Modifica/cancellazione ristorante: `PUT/DELETE /restaurants/:restaurantId`
- Ricerca ristorante per nome/luogo: `GET /restaurants/search?q=&address=`
- Ricerca ristorante per piatto: `GET /restaurants/search?meal=`
- Statistiche ristorante: `GET /restaurants/statistics`

### 3) Gestione piatti

- Lista e filtro piatti: `GET /meals`
- Ricerca piatti per nome/categoria/prezzo: query su `GET /meals`
- Ricerca piatti per ingredienti/allergeni:
  - `GET /meals?ingrediente=...`
  - `GET /meals?allergene=...`
  - combinabili insieme
- Piatti personalizzati ristoratore: `POST/PUT/DELETE /meals`

### 4) Gestione ordini e consegne

- Creazione ordine: `POST /orders`
  - Supporta ritiro in ristorante
  - Supporta consegna a domicilio
  - Per consegna a domicilio calcola distanza/costo da OpenStreetMap (Nominatim) se non viene fornito `distanza_km`
- Avanzamento stato ordine lato ristoratore: `PUT /orders/:id`
- Conferma consegna lato cliente: `PUT /orders/:id/consegna`
- Storico ordini cliente/ristoratore: `GET /orders`

## Note implementative

- Stato ordine: `ordinato` -> `in preparazione` -> `in consegna` -> `consegnato`
- Costo consegna: `1.2 €/km`
- I ristoranti salvano coordinate geografiche geocodificate (`location`) per velocizzare il calcolo distanza.

## Verifica rapida

```bash
npm test
```
