// index.js
const path = require("path");
require("dotenv").config({
    path: path.join(__dirname, ".env"),
    override: true
});

const express = require("express");
const axios = require("axios");
const cors = require("cors");

// --- Diagnóstico opcional (puedes borrar luego)
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
console.log("[server] cwd=", process.cwd());
console.log("[server] __dirname=", __dirname);
console.log(
    "[server] has KEY?",
    Boolean(OPENWEATHER_API_KEY),
    "len=",
    OPENWEATHER_API_KEY ? OPENWEATHER_API_KEY.length : 0
);

// --- App
const app = express();
// CORS abierto en dev (ajusta si quieres restringir)
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const OPENWEATHER_BASE = "https://api.openweathermap.org/data/2.5";
const OPENWEATHER_GEO = "https://api.openweathermap.org/geo/1.0";

app.get("/api/health", (_req, res) => {
    res.json({ ok: true, service: "api-proxy-server", time: new Date().toISOString() });
});

// Helper: quita acentos para mejorar el match por nombre
function stripAccents(s = "") {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

app.get("/api/weather", async (req, res) => {
    const raw = (req.query.q || "").trim();
    if (!raw) return res.status(400).json({ error: "Falta el parámetro q (ciudad)." });
    if (!OPENWEATHER_API_KEY) return res.status(500).json({ error: "OPENWEATHER_API_KEY no está configurado." });

    const q = raw;                   // lo que escribió el usuario
    const qNorm = stripAccents(raw); // versión sin acentos

    // 1) Intento por nombre directo
    const byName = () =>
        axios.get(`${OPENWEATHER_BASE}/weather`, {
            params: { q, appid: OPENWEATHER_API_KEY, units: "metric", lang: "es" }
        });

    // 2) Fallback: geocoding (lat/lon) -> weather
    const byGeo = async () => {
        const { data: geo } = await axios.get(`${OPENWEATHER_GEO}/direct`, {
            params: { q: qNorm, limit: 1, appid: OPENWEATHER_API_KEY }
        });

        if (!Array.isArray(geo) || geo.length === 0) {
            const msg = `Ciudad no encontrada: "${q}"`;
            return res.status(404).json({ error: "No se pudo obtener el clima.", details: msg });
        }

        const { lat, lon, name, country, state } = geo[0];
        const { data } = await axios.get(`${OPENWEATHER_BASE}/weather`, {
            params: { lat, lon, appid: OPENWEATHER_API_KEY, units: "metric", lang: "es" }
        });

        return res.json({
            city: name || data.name,
            country: country || data.sys?.country,
            state,
            coordinates: { lat, lon },
            temp: data.main?.temp,
            feels_like: data.main?.feels_like,
            humidity: data.main?.humidity,
            description: data.weather?.[0]?.description,
            icon: data.weather?.[0]?.icon,
            wind: { speed: data.wind?.speed, deg: data.wind?.deg },
            fetched_at: new Date().toISOString()
        });
    };

    try {
        const { data } = await byName();
        return res.json({
            city: data.name,
            country: data.sys?.country,
            coordinates: data.coord,
            temp: data.main?.temp,
            feels_like: data.main?.feels_like,
            humidity: data.main?.humidity,
            description: data.weather?.[0]?.description,
            icon: data.weather?.[0]?.icon,
            wind: { speed: data.wind?.speed, deg: data.wind?.deg },
            fetched_at: new Date().toISOString()
        });
    } catch (err) {
        const status = err?.response?.status || 500;
        const apiMsg = err?.response?.data?.message || err.message;
        if (status === 404) {
            console.warn("[server] Nombre no encontrado, probando geocoding:", q, "→", qNorm);
            try { return await byGeo(); }
            catch (e) {
                const msg = e?.response?.data?.message || e.message;
                console.error("Geocoding fail:", msg);
                return res.status(e?.response?.status || 500).json({ error: "No se pudo obtener el clima.", details: msg });
            }
        }
        console.error("Weather error:", status, apiMsg);
        return res.status(status).json({ error: "No se pudo obtener el clima.", details: apiMsg });
    }
});

app.listen(PORT, () => console.log(`[server] http://localhost:${PORT}`));
