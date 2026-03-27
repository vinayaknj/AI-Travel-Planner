import { fetchWithTimeout } from "./ai";

const MAPBOX_GEOCODING_BASE = "https://api.mapbox.com/geocoding/v5/mapbox.places";
const MAPBOX_MATRIX_BASE = "https://api.mapbox.com/directions-matrix/v1/mapbox";

function logInfo(message, data = {}) {
  console.log(`[mapbox] ${message}`, data);
}

function logError(message, error, data = {}) {
  console.error(`[mapbox] ${message}`, {
    ...data,
    error: error instanceof Error ? error.message : String(error),
  });
}

function getToken() {
  const token = process.env.MAPBOX_ACCESS_TOKEN;
  if (!token) {
    throw new Error("MAPBOX_ACCESS_TOKEN is not configured");
  }
  return token;
}

async function fetchJson(url) {
  const response = await fetchWithTimeout(url, {}, 15000);
  if (!response.ok) {
    throw new Error(`Mapbox HTTP ${response.status}`);
  }
  return response.json();
}

function toQuery(params) {
  return new URLSearchParams(params).toString();
}

export async function geocodePlaceName(name, proximity) {
  const query = toQuery({
    access_token: getToken(),
    limit: "1",
    autocomplete: "false",
    ...(proximity ? { proximity: `${proximity.lon},${proximity.lat}` } : {}),
  });

  const data = await fetchJson(
    `${MAPBOX_GEOCODING_BASE}/${encodeURIComponent(name)}.json?${query}`
  );

  const feature = data?.features?.[0];
  if (!feature?.center) {
    return null;
  }

  return {
    name,
    lon: feature.center[0],
    lat: feature.center[1],
    place_name: feature.place_name || name,
  };
}

function pairKey(from, to) {
  return `${from}__${to}`;
}

function minutesLabel(seconds) {
  if (!Number.isFinite(seconds)) return "travel time unavailable";
  const minutes = Math.max(1, Math.round(seconds / 60));
  return `${minutes} min transfer`;
}

function distanceLabel(meters) {
  if (!Number.isFinite(meters)) return "distance unavailable";
  if (meters < 1000) return `${Math.max(1, Math.round(meters))} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function nearestNeighborOrder(points, durations) {
  if (points.length <= 1) return points;

  const ordered = [0];
  const remaining = new Set(points.slice(1).map((_, index) => index + 1));

  while (remaining.size > 0) {
    const current = ordered[ordered.length - 1];
    let best = null;
    let bestDuration = Number.POSITIVE_INFINITY;

    for (const candidate of remaining) {
      const duration = durations?.[current]?.[candidate];
      if (Number.isFinite(duration) && duration < bestDuration) {
        best = candidate;
        bestDuration = duration;
      }
    }

    if (best === null) {
      best = [...remaining][0];
    }

    ordered.push(best);
    remaining.delete(best);
  }

  return ordered.map((index) => points[index]);
}

export async function buildRoutingContext(destination, places = []) {
  try {
    const candidates = places
      .filter((place) => place?.name && place?.point?.lon && place?.point?.lat)
      .slice(0, 6)
      .map((place) => ({
        key: place.xid || `${place.name}:${place.point.lon}:${place.point.lat}`,
        name: place.name,
        lon: place.point.lon,
        lat: place.point.lat,
        source: place.source || "OpenTripMap",
      }));
    logInfo("routing candidates prepared", {
      destination: destination?.name,
      candidates: candidates.map((item) => item.name),
    });

    if (candidates.length < 2) {
      logInfo("insufficient candidates for routing", { count: candidates.length });
      return {
        ordered_places: candidates,
        travel_pairs: {},
        route_note: "Not enough verified places for routing optimization.",
      };
    }

    const coordinates = candidates.map((place) => `${place.lon},${place.lat}`).join(";");
    const matrixQuery = toQuery({
      access_token: getToken(),
      annotations: "duration,distance",
    });
    const data = await fetchJson(`${MAPBOX_MATRIX_BASE}/driving/${coordinates}?${matrixQuery}`);
    const durations = data?.durations || [];
    const distances = data?.distances || [];

    const orderedPlaces = nearestNeighborOrder(candidates, durations);
    const travelPairs = {};

    candidates.forEach((fromPlace, fromIndex) => {
      candidates.forEach((toPlace, toIndex) => {
        if (fromIndex === toIndex) return;
        const seconds = durations?.[fromIndex]?.[toIndex];
        const meters = distances?.[fromIndex]?.[toIndex];
        travelPairs[pairKey(fromPlace.key, toPlace.key)] = {
          duration_seconds: seconds,
          duration_label: minutesLabel(seconds),
          distance_meters: meters,
          distance_label: distanceLabel(meters),
        };
      });
    });

    const orderedLegs = orderedPlaces.slice(0, -1).map((place, index) => {
      const nextPlace = orderedPlaces[index + 1];
      const leg = travelPairs[pairKey(place.key, nextPlace.key)] || {};
      return {
        from: place.name,
        to: nextPlace.name,
        duration_label: leg.duration_label || "travel time unavailable",
        distance_label: leg.distance_label || "distance unavailable",
      };
    });

    const result = {
      ordered_places: orderedPlaces,
      ordered_legs: orderedLegs,
      travel_pairs: travelPairs,
      route_note: "Sequenced with Mapbox driving-time optimization.",
    };
    logInfo("routing ready", {
      ordered_places: result.ordered_places.map((item) => item.name),
    });
    return result;
  } catch (error) {
    logError("routing failed", error, { destination: destination?.name });
    throw error;
  }
}
