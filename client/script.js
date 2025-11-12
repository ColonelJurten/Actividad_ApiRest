const form = document.getElementById("form");
const cityInput = document.getElementById("city");
const result = document.getElementById("result");

form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (!city) {
        result.innerHTML = `<p class="text-amber-400">Por favor escribe una ciudad.</p>`;
        return;
    }
    result.innerHTML = `<p class="text-slate-300">Buscando clima para <strong>${city}</strong>…</p>`;
    try {
        const resp = await fetch(
            `http://localhost:3001/api/weather?q=${encodeURIComponent(city)}`
        );
        if (!resp.ok) {
            const err = await resp.json().catch(() => ({}));
            throw new Error(err.error || `Error HTTP ${resp.status}`);
        }
        const data = await resp.json();
        renderWeather(data);
    } catch (err) {
        result.innerHTML = `<p class="text-red-400">No se pudo obtener el clima: ${err.message}</p>`;
    }
});

function renderWeather(data) {
    const iconUrl = data.icon
        ? `https://openweathermap.org/img/wn/${data.icon}@2x.png`
        : "";
    result.innerHTML = `
    <div class="mt-4 p-5 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-md">
      <div class="flex items-center gap-4">
        ${iconUrl ? `<img src="${iconUrl}" alt="icon" class="w-16 h-16" />` : ""
        }
        <div>
          <h3 class="text-xl font-semibold">${data.city || "—"}${data.country ? ", " + data.country : ""
        }</h3>
          <p class="text-slate-300">${data.description || "—"}</p>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        ${card("Temperatura", data.temp, "°C")}
        ${card("Sensación", data.feels_like, "°C")}
        ${card("Humedad", data.humidity, "%")}
        ${card("Viento", data.wind?.speed, "m/s")}
      </div>
      <div class="mt-2 text-xs text-slate-400">Actualizado: ${new Date(
            data.fetched_at
        ).toLocaleString()}</div>
    </div>
  `;
}
function card(label, value, units = "") {
    const v = value === undefined || value === null ? "—" : value;
    return `
    <div class="p-3 rounded-xl bg-slate-800/50">
      <div class="text-slate-400">${label}</div>
      <div class="text-2xl font-bold">${v} ${units}</div>
    </div>`;
}
