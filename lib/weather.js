import { fetchWithTimeout } from "./ai";

const OPEN_METEO_BASE = "https://api.open-meteo.com/v1/forecast";

function logInfo(message, data = {}) {
  console.log(`[open-meteo] ${message}`, data);
}

function logError(message, error, data = {}) {
  console.error(`[open-meteo] ${message}`, {
    ...data,
    error: error instanceof Error ? error.message : String(error),
  });
}

async function fetchJson(url) {
  const response = await fetchWithTimeout(url, {}, 15000);
  if (!response.ok) {
    throw new Error(`Open-Meteo HTTP ${response.status}`);
  }
  return response.json();
}

function toQuery(params) {
  return new URLSearchParams(params).toString();
}

function average(values = []) {
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + Number(value || 0), 0) / values.length;
}

function summarizeWeather(days) {
  if (!days.length) {
    return {
      climate_note: "Weather data unavailable for selected dates.",
      safety_alerts: [],
      packing_list: { clothing: [], essentials: [], health: [] },
    };
  }

  const maxTemps = days.map((day) => day.temp_max);
  const minTemps = days.map((day) => day.temp_min);
  const rainTotals = days.map((day) => day.precipitation);
  const windSpeeds = days.map((day) => day.wind_max);

  const avgHigh = average(maxTemps);
  const avgLow = average(minTemps);
  const totalRain = rainTotals.reduce((sum, value) => sum + Number(value || 0), 0);
  const maxWind = Math.max(...windSpeeds, 0);

  const safety_alerts = [];
  const clothing = [];
  const essentials = [];
  const health = [];

  if (avgHigh >= 32) {
    safety_alerts.push({
      type: "weather",
      title: "Hot conditions expected",
      detail: "Plan shade and hydration during the warmest afternoon hours.",
    });
    clothing.push("Breathable light clothing");
    health.push("Electrolytes or hydration tablets");
  }

  if (avgLow <= 10) {
    safety_alerts.push({
      type: "weather",
      title: "Cool temperatures expected",
      detail: "Pack layers for mornings and evenings.",
    });
    clothing.push("Light jacket or sweater");
  }

  if (totalRain >= 8) {
    safety_alerts.push({
      type: "weather",
      title: "Rain likely during your dates",
      detail: "Keep indoor backup plans and carry waterproof gear.",
    });
    essentials.push("Compact umbrella");
    clothing.push("Water-resistant shoes");
  }

  if (maxWind >= 35) {
    safety_alerts.push({
      type: "weather",
      title: "Windy conditions possible",
      detail: "Outdoor viewpoints and boat activities may need flexibility.",
    });
    essentials.push("Windproof outer layer");
  }

  const climateNote = `Forecast for your dates is roughly ${Math.round(avgLow ?? 0)}-${Math.round(avgHigh ?? 0)}°C with about ${Math.round(totalRain)} mm of rain expected.`;

  return {
    climate_note: climateNote,
    safety_alerts,
    packing_list: {
      clothing: Array.from(new Set(clothing)),
      essentials: Array.from(new Set(essentials)),
      health: Array.from(new Set(health)),
    },
  };
}

export async function fetchWeatherContext(lat, lon, startDate, endDate) {
  try {
    logInfo("fetching forecast", { lat, lon, startDate, endDate });
    const query = toQuery({
      latitude: String(lat),
      longitude: String(lon),
      start_date: startDate,
      end_date: endDate,
      timezone: "auto",
      daily: [
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "windspeed_10m_max",
      ].join(","),
    });

    const data = await fetchJson(`${OPEN_METEO_BASE}?${query}`);
    const daily = data?.daily;

    const days = (daily?.time || []).map((date, index) => ({
      date,
      temp_max: daily?.temperature_2m_max?.[index],
      temp_min: daily?.temperature_2m_min?.[index],
      precipitation: daily?.precipitation_sum?.[index],
      wind_max: daily?.windspeed_10m_max?.[index],
    }));

    const result = {
      forecast_days: days,
      ...summarizeWeather(days),
    };
    logInfo("forecast ready", {
      days: result.forecast_days.length,
      alerts: result.safety_alerts.length,
      climate_note: result.climate_note,
    });
    return result;
  } catch (error) {
    logError("forecast failed", error, { lat, lon, startDate, endDate });
    throw error;
  }
}
