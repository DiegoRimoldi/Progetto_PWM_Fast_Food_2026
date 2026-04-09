const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/search";

async function geocodeAddress(address) {
  if (!address || typeof address !== "string") {
    throw new Error("Indirizzo non valido");
  }

  const url = new URL(NOMINATIM_BASE_URL);
  url.searchParams.set("q", address);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      "User-Agent": "fastfood-pwm-unimi/1.0 (student-project)"
    }
  });

  if (!response.ok) {
    throw new Error(`Servizio di geocoding non disponibile (${response.status})`);
  }

  const data = await response.json();
  if (!Array.isArray(data) || data.length === 0) {
    throw new Error("Impossibile geocodificare l'indirizzo fornito");
  }

  const firstResult = data[0];
  return {
    lat: Number(firstResult.lat),
    lon: Number(firstResult.lon),
    displayName: firstResult.display_name
  };
}

function toRadians(value) {
  return (value * Math.PI) / 180;
}

function distanceInKm(from, to) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLon = toRadians(to.lon - from.lon);

  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((earthRadiusKm * c).toFixed(2));
}

module.exports = {
  geocodeAddress,
  distanceInKm
};
