import { fetchWithTimeout } from "./ai";

const MAPBOX_GEOCODING_BASE = "https://api.mapbox.com/geocoding/v5/mapbox.places";
const MAPBOX_MATRIX_BASE = "https://api.mapbox.com/directions-matrix/v1/mapbox";
const MAPBOX_DIRECTIONS_BASE = "https://api.mapbox.com/directions/v5/mapbox";

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

function profileLabel(profile) {
  return profile === "walking" ? "Walking" : "Driving";
}

function pickProfileForLeg(meters) {
  if (Number.isFinite(meters) && meters <= 1800) {
    return "walking";
  }
  return "driving";
}

function summarizeSteps(steps = []) {
  return steps
    .slice(0, 3)
    .map((step) => {
      const instruction = String(step?.maneuver?.instruction || "").trim();
      if (!instruction) return null;
      const distance = distanceLabel(step?.distance);
      return `${instruction} (${distance})`;
    })
    .filter(Boolean);
}

async function fetchDirectionsLeg(fromPlace, toPlace, profile) {
  const coordinates = `${fromPlace.lon},${fromPlace.lat};${toPlace.lon},${toPlace.lat}`;
  const query = toQuery({
    access_token: getToken(),
    geometries: "geojson",
    steps: "true",
    overview: "simplified",
  });
  const data = await fetchJson(`${MAPBOX_DIRECTIONS_BASE}/${profile}/${coordinates}?${query}`);
  const route = data?.routes?.[0];

  if (!route) {
    return {
      profile,
      profile_label: profileLabel(profile),
      duration_seconds: null,
      duration_label: "travel time unavailable",
      distance_meters: null,
      distance_label: "distance unavailable",
      step_summary: [],
      geometry: null,
    };
  }

  const steps = route?.legs?.flatMap((leg) => leg?.steps || []) || [];
  return {
    profile,
    profile_label: profileLabel(profile),
    duration_seconds: route.duration,
    duration_label: minutesLabel(route.duration),
    distance_meters: route.distance,
    distance_label: distanceLabel(route.distance),
    step_summary: summarizeSteps(steps),
    geometry: route.geometry || null,
  };
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
        ordered_legs: [],
        travel_pairs: {},
        recommended_profile: "walking",
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

    const orderedLegs = await Promise.all(
      orderedPlaces.slice(0, -1).map(async (place, index) => {
        const nextPlace = orderedPlaces[index + 1];
        const matrixLeg = travelPairs[pairKey(place.key, nextPlace.key)] || {};
        const profile = pickProfileForLeg(matrixLeg.distance_meters);

        let directionsLeg = null;
        try {
          directionsLeg = await fetchDirectionsLeg(place, nextPlace, profile);
        } catch (error) {
          logError("directions leg fetch failed", error, {
            from: place.name,
            to: nextPlace.name,
            profile,
          });
        }

        return {
          from: place.name,
          to: nextPlace.name,
          profile,
          profile_label: profileLabel(profile),
          duration_seconds: directionsLeg?.duration_seconds ?? matrixLeg.duration_seconds ?? null,
          duration_label: directionsLeg?.duration_label || matrixLeg.duration_label || "travel time unavailable",
          distance_meters: directionsLeg?.distance_meters ?? matrixLeg.distance_meters ?? null,
          distance_label: directionsLeg?.distance_label || matrixLeg.distance_label || "distance unavailable",
          step_summary: directionsLeg?.step_summary || [],
          geometry: directionsLeg?.geometry || null,
        };
      })
    );

    const totalDurationSeconds = orderedLegs.reduce(
      (sum, leg) => sum + (Number.isFinite(leg.duration_seconds) ? leg.duration_seconds : 0),
      0
    );
    const totalDistanceMeters = orderedLegs.reduce(
      (sum, leg) => sum + (Number.isFinite(leg.distance_meters) ? leg.distance_meters : 0),
      0
    );
    const walkingLegs = orderedLegs.filter((leg) => leg.profile === "walking").length;
    const drivingLegs = orderedLegs.filter((leg) => leg.profile === "driving").length;
    const recommendedProfile = walkingLegs > drivingLegs ? "walking" : "driving";

    const result = {
      ordered_places: orderedPlaces,
      ordered_legs: orderedLegs,
      travel_pairs: travelPairs,
      total_duration_seconds: totalDurationSeconds,
      total_duration_label: minutesLabel(totalDurationSeconds),
      total_distance_meters: totalDistanceMeters,
      total_distance_label: distanceLabel(totalDistanceMeters),
      recommended_profile: recommendedProfile,
      route_note: `Sequenced with Mapbox optimization using ${profileLabel(recommendedProfile).toLowerCase()}-aware leg guidance.`,
    };
    logInfo("routing ready", {
      ordered_places: result.ordered_places.map((item) => item.name),
      total_duration_label: result.total_duration_label,
      total_distance_label: result.total_distance_label,
      recommended_profile: result.recommended_profile,
    });
    return result;
  } catch (error) {
    logError("routing failed", error, { destination: destination?.name });
    throw error;
  }
}
