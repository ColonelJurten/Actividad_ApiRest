// index.js
const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENWEATHER_BASE = "https://api.openweathermap.org/data/2.5";

app.get("/api/health", (req, res) => {
    res.json({ ok: true, service: "api-proxy-server", time: new Date().toISOString() });
});

app.get("/api/weather", async (req, res) => {
    try {
        const q = (req.query.q || "").trim();
        if (!q) return res.status(400).json({ error: "Falta el parámetro q (ciudad)." });
        if (!OPENWEATHER_API_KEY) {
            return res.status(500).json({ error: "OPENWEATHER_API_KEY no está configurado." });
        }
        const { data } = await axios.get(`${OPENWEATHER_BASE}/weather`, {
            params: { q, appid: OPENWEATHER_API_KEY, units: "metric", lang: "es" }
        });
        res.json({
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
        res.status(status).json({
            error: "No se pudo obtener el clima.",
            details: err?.response?.data || err.message
        });
    }
});

app.listen(PORT, () => console.log(`[server] http://localhost:${PORT}`));
