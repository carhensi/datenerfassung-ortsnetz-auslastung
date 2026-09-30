const https = require('https');
// Openhab Ortsnetz V: 0.2
// Version Date: 2026-09-19
// added optional installed kwp and pv forecast

// Holt alle übergebenen Argumente aus der Konsole
const args = process.argv.slice(2);
const l1 = parseFloat(args[0]) || 230.0;
const l2 = parseFloat(args[1]) || 230.0;
const l3 = parseFloat(args[2]) || 230.0;
const hz = parseFloat(args[3]) || 50.0;

// Optionale PV-Werte prüfen
const rawKwp = args[4];
const rawForecast = args[5];
const rawSmartmeterModel = args[8];

// Dynamische Koordinaten mit Fallback parsen
const rawLat = parseFloat(args[6]) || 53.000000;
const rawLon = parseFloat(args[7]) || 7.000000;

// Koordinaten mathematisch auf exakt 6 Nachkommastellen runden
const lat = parseFloat(rawLat.toFixed(6));
const lon = parseFloat(rawLon.toFixed(6));

// ISO-Zeitstempel bauen
const now = new Date().toISOString().split('.')[0] + 'Z';

// Basis-Payload mit dynamischen Pflichtfeldern
const dataObject = {
  observed_at: now,
  latitude: lat,
  longitude: lon,
  l1_v: l1,
  l2_v: l2,
  l3_v: l3,
  grid_frequency_hz: hz,
  integration_version: 'Openhab Ortsnetz V: 0.2'
};

// Optionale PV-Felder nur hinzufügen, wenn sie übergeben wurden
if (rawForecast && rawForecast.trim() !== "" && !isNaN(rawForecast)) { dataObject.pv_forecast_kwh = parseFloat(rawForecast); }
if (rawKwp && rawKwp.trim() !== "" && !isNaN(rawKwp)) { dataObject.plant_capacity_kwp = parseFloat(rawKwp); }
if (typeof rawSmartmeterModel === "string" && rawSmartmeterModel.trim() !== "" && rawSmartmeterModel.trim().length <= 120) {
  dataObject.smartmeter_model = rawSmartmeterModel.trim();
}

const payload = JSON.stringify(dataObject);


const options = {
  hostname: 'www.ortsnetz-auslastung.de',
  port: 443,
  path: '/v1/measurements',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => console.log(body));
});

req.on('error', (e) => console.log(`{"error":"${e.message}"}`));
req.write(payload);
req.end();
