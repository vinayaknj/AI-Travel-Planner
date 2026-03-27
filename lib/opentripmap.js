import { fetchWithTimeout } from "./ai";
import { geocodePlaceName } from "./mapbox";

const OPEN_TRIP_MAP_BASE = "https://api.opentripmap.com/0.1/en/places";

function logInfo(message, data = {}) {
  console.log(`[opentripmap] ${message}`, data);
}

function logError(message, error, data = {}) {
  console.error(`[opentripmap] ${message}`, {
    ...data,
    error: error instanceof Error ? error.message : String(error),
  });
}

function getApiKey() {
  const apiKey = process.env.OPENTRIPMAP_API_KEY;
  if (!apiKey) {
    throw new Error("OPENTRIPMAP_API_KEY is not configured");
  }
  return apiKey;
}

async function fetchJson(url) {
  const response = await fetchWithTimeout(url, {}, 15000);
  if (!response.ok) {
    throw new Error(`OpenTripMap HTTP ${response.status}`);
  }
  return response.json();
}

function toQuery(params) {
  return new URLSearchParams(params).toString();
}

function normalizeName(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeText(value) {
  return normalizeName(value).replace(/\s+/g, " ").trim();
}

function simplifyName(value) {
  return normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(cathedral|basilica|church|diocese|saint|st|roman catholic|csi|fort)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function descriptionKey(value) {
  return normalizeText(value).toLowerCase().slice(0, 140);
}

function isLikelyEnglish(value) {
  const text = normalizeText(value);
  if (!text) return false;
  const asciiChars = text.replace(/[^\x00-\x7F]/g, "").length;
  return asciiChars / text.length > 0.92;
}

async function geocodeDestination(name) {
  logInfo("geocoding destination", { name });
  const mapboxMatch = await geocodePlaceName(name);
  if (!mapboxMatch?.lat || !mapboxMatch?.lon) {
    throw new Error("Destination not found in Mapbox geocoding");
  }

  return {
    name: mapboxMatch.place_name || mapboxMatch.name || name,
    country: "",
    lat: mapboxMatch.lat,
    lon: mapboxMatch.lon,
  };
}

async function fetchPlaceDetails(xid) {
  const query = toQuery({ apikey: getApiKey() });
  const data = await fetchJson(`${OPEN_TRIP_MAP_BASE}/xid/${xid}?${query}`);
  return {
    xid,
    name: normalizeName(data?.name),
    kinds: data?.kinds || "",
    wikipedia: data?.wikipedia || "",
    preview: data?.preview?.source || "",
    description:
      normalizeName(data?.wikipedia_extracts?.text) ||
      normalizeName(data?.info?.descr) ||
      "",
    address: normalizeName(data?.address?.road || data?.address?.suburb || data?.address?.city),
    point: data?.point || null,
  };
}

function classifyPlaceKinds(kinds) {
  const kindList = String(kinds || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  if (kindList.some((item) => item.includes("foods") || item.includes("restaurants") || item.includes("catering"))) {
    return "restaurant";
  }
  if (kindList.some((item) => item.includes("museums") || item.includes("historic") || item.includes("cultural"))) {
    return "culture";
  }
  if (kindList.some((item) => item.includes("natural") || item.includes("beaches") || item.includes("islands"))) {
    return "nature";
  }
  return "attraction";
}

function mapAttraction(place) {
  return {
    xid: place.xid,
    name: place.name,
    category: classifyPlaceKinds(place.kinds),
    description:
      isLikelyEnglish(place.description) && place.description
        ? place.description
        : `${place.name} is a verified point of interest in this destination.`,
    best_time: "Daytime",
    hidden_gem: false,
    source: "OpenTripMap",
    wikipedia: place.wikipedia,
    point: place.point,
  };
}

function mapRestaurant(place) {
  return {
    xid: place.xid,
    name: place.name,
    cuisine: "Local dining",
    signature_dish: "Check local specialties",
    budget_level: "Varies",
    neighborhood: place.address || "Destination center",
    source: "OpenTripMap",
    wikipedia: place.wikipedia,
    point: place.point,
  };
}

function dedupePlaces(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item?.name) return false;

    const nameKey = simplifyName(item.name);
    const descKey = descriptionKey(item.description);
    const wikiKey = normalizeText(item.wikipedia).toLowerCase();
    const pointKey = item.point?.lat && item.point?.lon
      ? `${item.point.lat.toFixed(4)}:${item.point.lon.toFixed(4)}`
      : "";
    const compositeKeys = [
      wikiKey && `wiki:${wikiKey}`,
      descKey && `desc:${descKey}`,
      nameKey && pointKey && `namepoint:${nameKey}:${pointKey}`,
      nameKey && `name:${nameKey}`,
    ].filter(Boolean);

    if (compositeKeys.some((key) => seen.has(key))) {
      return false;
    }

    compositeKeys.forEach((key) => seen.add(key));
    return true;
  });
}

export async function fetchDestinationContext(destination) {
  try {
    const geo = await geocodeDestination(destination);
    logInfo("destination resolved", geo);

    const commonQuery = {
      radius: "7000",
      lon: String(geo.lon),
      lat: String(geo.lat),
      rate: "3",
      format: "json",
      limit: "12",
      apikey: getApiKey(),
    };

    const [rawAttractions, rawFood] = await Promise.all([
      fetchJson(
        `${OPEN_TRIP_MAP_BASE}/radius?${toQuery({
          ...commonQuery,
          kinds: "interesting_places,cultural,historic,museums,natural",
        })}`
      ),
      fetchJson(
        `${OPEN_TRIP_MAP_BASE}/radius?${toQuery({
          ...commonQuery,
          kinds: "restaurants,cafes,foods",
        })}`
      ),
    ]);
    logInfo("radius search complete", {
      destination,
      raw_attractions: rawAttractions?.length || 0,
      raw_restaurants: rawFood?.length || 0,
    });

    const attractionDetails = await Promise.all(
      (rawAttractions || [])
        .filter((item) => normalizeName(item?.name))
        .slice(0, 18)
        .map((item) =>
          fetchPlaceDetails(item.xid).catch((error) => {
            logError("attraction detail lookup failed", error, { xid: item.xid, name: item.name });
            return null;
          })
        )
    );

    const restaurantDetails = await Promise.all(
      (rawFood || [])
        .filter((item) => normalizeName(item?.name))
        .slice(0, 18)
        .map((item) =>
          fetchPlaceDetails(item.xid).catch((error) => {
            logError("restaurant detail lookup failed", error, { xid: item.xid, name: item.name });
            return null;
          })
        )
    );

    const result = {
      destination: geo,
      attractions: dedupePlaces(attractionDetails.filter((item) => item?.name)).map(mapAttraction).slice(0, 6),
      restaurants: dedupePlaces(restaurantDetails.filter((item) => item?.name)).map(mapRestaurant).slice(0, 6),
    };
    logInfo("destination context ready", {
      destination: result.destination.name,
      attractions: result.attractions.length,
      restaurants: result.restaurants.length,
    });
    return result;
  } catch (error) {
    logError("destination context failed", error, { destination });
    throw error;
  }
}
