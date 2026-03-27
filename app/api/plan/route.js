
    import { NextResponse } from "next/server";
    import { z } from "zod";
    import { callGroq, callGemini } from "../../../lib/ai";
    import { fetchDestinationContext } from "../../../lib/opentripmap";
    import { buildRoutingContext } from "../../../lib/mapbox";
    import { fetchWeatherContext } from "../../../lib/weather";

    // In-memory cache (use Redis in prod)
    const cache = new Map();
    const RATE = { windowMs: 60000, max: 20 };
    const hits = new Map(); // ip -> {count, ts}

    const PlaceSchema = z.object({
      name: z.string(),
      source: z.string().optional(),
    }).passthrough();

    const SlotSchema = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      location: z.string().optional(),
      duration: z.string().optional(),
      tips: z.string().optional(),
      tags: z.array(z.string()).optional(),
    }).optional();

    const TransportOptionSchema = z.union([
      z.string(),
      z.object({
        mode: z.string().optional(),
        icon: z.string().optional(),
        route: z.string().optional(),
        duration: z.string().optional(),
        cost: z.string().optional(),
        recommended: z.boolean().optional(),
        note: z.string().optional(),
      }).passthrough(),
    ]);

    const BudgetLineSchema = z.object({
      amount: z.number().optional(),
      note: z.string().optional(),
    }).passthrough();

    const BudgetSchema = z.object({
      currency: z.string().optional(),
      travel: BudgetLineSchema.optional(),
      accommodation: BudgetLineSchema.optional(),
      food: BudgetLineSchema.optional(),
      activities: BudgetLineSchema.optional(),
      total: z.number().optional(),
      saving_tips: z.array(z.string()).optional(),
    }).passthrough();

    const LocalTransportSchema = z.object({
      mode: z.string().optional(),
      cost: z.string().optional(),
      recommendation: z.string().optional(),
    }).passthrough();

    const StaySchema = z.object({
      area: z.string().optional(),
      description: z.string().optional(),
      good_for: z.array(z.string()).optional(),
      price_range: z.string().optional(),
    }).passthrough();

    const BookingInfoSchema = z.object({
      place: z.string().optional(),
      entry_fee: z.string().optional(),
      timings: z.string().optional(),
      advance_booking: z.string().optional(),
    }).passthrough();

    const AlertSchema = z.object({
      type: z.string().optional(),
      title: z.string().optional(),
      detail: z.string().optional(),
    }).passthrough();

    const AlternativeDateSchema = z.object({
      range: z.string().optional(),
      score: z.string().optional(),
      reasons: z.array(z.string()).optional(),
    }).passthrough();

    const MustTryFoodSchema = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      best_time: z.string().optional(),
      where_to_try: z.string().optional(),
    }).passthrough();

    function toArray(value) {
      if (Array.isArray(value)) return value;
      if (value == null) return [];
      if (typeof value === "object") return Object.values(value);
      return [value];
    }

    function toStringList(value) {
      return toArray(value)
        .map((item) => {
          if (typeof item === "string") return item;
          if (typeof item === "number" || typeof item === "boolean") return String(item);
          if (item && typeof item === "object") {
            return item.text || item.tip || item.name || item.title || item.label || "";
          }
          return "";
        })
        .filter(Boolean);
    }

    function normalizeSlot(slot, fallbackTitle, fallbackTag) {
      if (typeof slot === "string") {
        return {
          title: fallbackTitle,
          description: slot,
          duration: "Flexible window",
          location: "",
          tips: "",
          tags: [fallbackTag],
        };
      }

      return {
        title: slot?.title || fallbackTitle,
        description: slot?.description || fallbackTitle,
        location: slot?.location || "",
        duration: slot?.duration || "Flexible window",
        tips: slot?.tips || "",
        tags: toStringList(slot?.tags).length ? toStringList(slot?.tags) : [fallbackTag],
      };
    }

    function sanitizeItinerary(itinerary, days) {
      return toArray(itinerary).slice(0, days).map((day, index) => ({
        day: Number(day?.day) || index + 1,
        date: typeof day?.date === "string" && day.date.trim() ? day.date : `Day ${index + 1}`,
        theme: typeof day?.theme === "string" && day.theme.trim() ? day.theme : "Explore",
        morning: normalizeSlot(day?.morning, "Start with a signature local experience", "Morning"),
        afternoon: normalizeSlot(day?.afternoon, "Keep the pace with a central highlight", "Afternoon"),
        evening: normalizeSlot(day?.evening, "Wrap up with food or a scenic walk", "Evening"),
      }));
    }

    function sanitizeAlerts(alerts) {
      return toArray(alerts).map((item) => {
        if (typeof item === "string") {
          return { type: "safety", title: "Travel note", detail: item };
        }
        return {
          type: item?.type || "safety",
          title: item?.title || "Travel note",
          detail: item?.detail || item?.description || item?.note || "",
        };
      }).filter((item) => item.detail || item.title);
    }

    function sanitizePackingList(packingList) {
      if (packingList && typeof packingList === "object" && !Array.isArray(packingList)) {
        return {
          clothing: toStringList(packingList.clothing),
          essentials: toStringList(packingList.essentials),
          health: toStringList(packingList.health),
          documents: toStringList(packingList.documents),
          tech: toStringList(packingList.tech),
        };
      }

      const essentials = toStringList(packingList);
      return { clothing: [], essentials, health: [], documents: [], tech: [] };
    }

    function sanitizeObjectList(items, mapper) {
      return toArray(items).map(mapper).filter(Boolean);
    }

    function sanitizeMustTryFoods(items) {
      return sanitizeObjectList(items, (item) => {
        if (typeof item === "string") {
          return {
            name: item,
            description: "",
            best_time: "",
            where_to_try: "",
          };
        }

        return {
          name: item?.name || item?.dish || item?.title || "Local specialty",
          description: item?.description || item?.note || "",
          best_time: item?.best_time || item?.when || "",
          where_to_try: item?.where_to_try || item?.where || item?.restaurant || "",
        };
      });
    }

    function sanitizePlan(rawPlan, days) {
      if (!rawPlan || typeof rawPlan !== "object") return rawPlan;

      return {
        ...rawPlan,
        destination_summary:
          typeof rawPlan.destination_summary === "string" && rawPlan.destination_summary.trim()
            ? rawPlan.destination_summary
            : "A practical trip plan built from verified travel data.",
        climate_note:
          typeof rawPlan.climate_note === "string" ? rawPlan.climate_note : "",
        attractions: toArray(rawPlan.attractions),
        restaurants: toArray(rawPlan.restaurants),
        must_try_foods: sanitizeMustTryFoods(rawPlan.must_try_foods),
        transport_options: toArray(rawPlan.transport_options),
        best_transport: typeof rawPlan.best_transport === "string" ? rawPlan.best_transport : "",
        local_tips: toStringList(rawPlan.local_tips),
        safety_alerts: sanitizeAlerts(rawPlan.safety_alerts),
        packing_list: sanitizePackingList(rawPlan.packing_list),
        local_transport: sanitizeObjectList(rawPlan.local_transport, (item) => {
          if (typeof item === "string") {
            return { mode: item, cost: "", recommendation: "" };
          }
          return {
            mode: item?.mode || item?.name || "Local transport",
            cost: item?.cost || "",
            recommendation: item?.recommendation || item?.note || "",
          };
        }),
        stay_recommendations: sanitizeObjectList(rawPlan.stay_recommendations, (item) => {
          if (typeof item === "string") {
            return { area: item, description: "", good_for: [], price_range: "" };
          }
          return {
            area: item?.area || item?.name || "Recommended area",
            description: item?.description || item?.note || "",
            good_for: toStringList(item?.good_for),
            price_range: item?.price_range || "",
          };
        }),
        booking_info: sanitizeObjectList(rawPlan.booking_info, (item) => {
          if (typeof item === "string") {
            return { place: item, entry_fee: "", timings: "", advance_booking: "recommended" };
          }
          return {
            place: item?.place || item?.name || "Booking item",
            entry_fee: item?.entry_fee || item?.fee || "",
            timings: item?.timings || item?.hours || "",
            advance_booking: item?.advance_booking || "recommended",
          };
        }),
        alternative_dates: sanitizeObjectList(rawPlan.alternative_dates, (item) => {
          if (typeof item === "string") {
            return { range: item, score: "", reasons: [] };
          }
          return {
            range: item?.range || item?.dates || "Current dates",
            score: item?.score ? String(item.score) : "",
            reasons: toStringList(item?.reasons),
          };
        }),
        itinerary: sanitizeItinerary(rawPlan.itinerary, days),
      };
    }

    const PlanSchema = z.object({
      destination_summary: z.string().optional(),
      climate_note: z.string().optional(),
      attractions: z.array(z.union([z.string(), PlaceSchema])).optional(),
      restaurants: z.array(z.union([z.string(), PlaceSchema])).optional(),
      must_try_foods: z.array(MustTryFoodSchema).optional(),
      transport_options: z.array(TransportOptionSchema).optional(),
      best_transport: z.string().optional(),
      budget: BudgetSchema.optional(),
      budget_estimate: z.string().optional(),
      safety_alerts: z.array(AlertSchema).optional(),
      packing_list: z.object({
        clothing: z.array(z.string()).optional(),
        essentials: z.array(z.string()).optional(),
        health: z.array(z.string()).optional(),
        documents: z.array(z.string()).optional(),
        tech: z.array(z.string()).optional(),
      }).passthrough().optional(),
      local_transport: z.array(LocalTransportSchema).optional(),
      stay_recommendations: z.array(StaySchema).optional(),
      booking_info: z.array(BookingInfoSchema).optional(),
      local_tips: z.array(z.string()).optional(),
      alternative_dates: z.array(AlternativeDateSchema).optional(),
      itinerary: z.array(
        z.object({
          day: z.number(),
          date: z.string(),
          theme: z.string().optional(),
          morning: SlotSchema,
          afternoon: SlotSchema,
          evening: SlotSchema,
        })
      ).min(1)
    }).passthrough();

    function rateLimit(ip) {
      const now = Date.now();
      const rec = hits.get(ip) || { count: 0, ts: now };
      if (now - rec.ts > RATE.windowMs) {
        hits.set(ip, { count: 1, ts: now });
        return true;
      }
      if (rec.count >= RATE.max) return false;
      rec.count += 1;
      hits.set(ip, rec);
      return true;
    }

    function keyOf(body) {
      const { from, to, startDate, endDate, budget, travelType, interests } = body;
      return JSON.stringify({ from, to, startDate, endDate, budget, travelType, interests });
    }

    function buildSystemPrompt() {
      return `You are a travel planner AI.
Return ONLY valid JSON.
Write all output text in English only.
Use the provider-backed context exactly as given when naming places, weather, or routing details.
Do not invent attractions or restaurants that are not in the verified lists.
If provider-backed context is unavailable, still create a rich, detailed, practical travel plan from the user request alone.
When data is inferred instead of verified, keep it clearly practical and avoid fake precise claims.
When you need to infer soft guidance like pacing, local transport, or stay area suggestions, keep it generic and clearly practical.
Always include an itinerary with at least 1 day.`;
    }

    function buildUserPrompt(form, days, verifiedContext, weatherContext, routingContext) {
      const attractionList = (verifiedContext?.attractions || [])
        .map((item) => `- ${item.name}: ${item.description}`)
        .join("\n");
      const restaurantList = (verifiedContext?.restaurants || [])
        .map((item) => `- ${item.name}: cuisine ${item.cuisine || "local"}, neighborhood ${item.neighborhood || "central"}, signature dish ${item.signature_dish || "local specialty"}`)
        .join("\n");
      const weatherSummary = weatherContext?.climate_note || "Weather data unavailable";
      const routeSummary = (routingContext?.ordered_places || [])
        .map((item, index) => {
          const nextLeg = routingContext?.ordered_legs?.[index];
          if (!nextLeg) return `${index + 1}. ${item.name}`;
          return `${index + 1}. ${item.name} -> ${nextLeg.to} (${nextLeg.profile_label || "Transfer"}: ${nextLeg.duration_label}, ${nextLeg.distance_label})`;
        })
        .join("\n");
      const weatherAlerts = (weatherContext?.safety_alerts || [])
        .map((item) => `- ${item.title}: ${item.detail}`)
        .join("\n");
      const packingHints = Object.entries(weatherContext?.packing_list || {})
        .map(([section, items]) => `- ${section}: ${(items || []).join(", ") || "none"}`)
        .join("\n");

      return `Trip:
From: ${form.from}
To: ${form.to}
Dates: ${form.startDate} to ${form.endDate}
Budget: ${form.budget}
Type: ${form.travelType}
Interests: ${(form.interests || []).join(", ")}
Weather summary: ${weatherSummary}
Route summary: ${routingContext?.route_note || "Routing data unavailable"}
Estimated route total: ${routingContext?.total_duration_label || "n/a"} over ${routingContext?.total_distance_label || "n/a"}
Suggested visit order:
${routeSummary || "- No routing data"}
Weather-backed alerts:
${weatherAlerts || "- None"}
Packing hints:
${packingHints || "- None"}

Verification status:
- Verified attractions available: ${(verifiedContext?.attractions || []).length > 0 ? "yes" : "no"}
- Verified restaurants available: ${(verifiedContext?.restaurants || []).length > 0 ? "yes" : "no"}
- Weather data available: ${weatherContext ? "yes" : "no"}
- Routing data available: ${routingContext ? "yes" : "no"}

Verified attractions:
${attractionList || "- None available"}

Verified restaurants:
${restaurantList || "- None available"}

Output:
- Exactly ${days} days itinerary (morning/afternoon/evening)
- Include:
  - destination_summary
  - climate_note
  - itinerary
  - attractions
  - restaurants
  - must_try_foods
  - transport_options
  - best_transport
  - budget
  - local_transport
  - stay_recommendations
  - budget_estimate
  - safety_alerts
  - packing_list
  - booking_info
  - local_tips
  - alternative_dates
- Return at least 4 attractions when available
- Return at least 4 restaurants or food stops when available
- Return at least 5 must_try_foods when food interest is present, otherwise at least 3 if possible
- Return at least 2 transport options
- Make each itinerary slot specific and descriptive, not generic placeholders
- Make each itinerary slot operationally useful: what to do, where to go, what to eat nearby, and why that time of day works
- Make destination_summary 2 to 4 strong sentences
- Make each attraction description 2 to 3 useful sentences when verified text is available
- For restaurants, include cuisine, signature_dish, budget_level, and neighborhood for every item
- For must_try_foods, include name, description, best_time, and where_to_try
- Include iconic local dishes, must-try foods, or regional specialties inside restaurants, local_tips, booking_info, and itinerary descriptions
- Make at least one food-led recommendation every day when food interest is present, or at least every other day otherwise
- Mention specific meal moments like breakfast, lunch, snacks, dessert, or dinner whenever they improve the itinerary
- Use verified restaurants when available; if they are too few, keep venue names verified but you may add practical cuisine guidance around them
- Budget must be in INR only
- Budget must be reasonably tailored to ${days} day(s) in ${form.to}, not a generic template
- Include line items for travel, accommodation, food, and activities, plus total
- Make budget_estimate a short practical explanation of why the INR estimate is reasonable
- Use only the verified attractions/restaurants above when naming places
- If verified attractions/restaurants are unavailable, use broad destination-level guidance instead of fake precise venue facts
- Use the suggested visit order and keep nearby places together
- Include location and short transfer-aware tips when possible
- Use routing context to decide when walking is realistic versus when a vehicle transfer makes more sense
- Reflect route pacing in the itinerary so nearby stops feel naturally grouped
- Keep weather notes consistent with the provided weather summary
- If suggesting alternative dates, base them only on weather comfort, not invented pricing or crowd data
- Write every field value in English only
- Make itinerary descriptions vivid and useful, with enough detail to feel premium
- Ensure the itinerary feels complete for a traveler: sightseeing, meals, local transport rhythm, rest breaks, and practical notes
- If unsure, use well-known places or generic cuisine guidance without inventing exact venue facts
- If any section is incomplete, still return itinerary`;
    }

    function normalizeKey(value) {
      return String(value || "").trim().toLowerCase();
    }

    function mergeByIdentity(baseItems, enrichedItems) {
      const enrichedMap = new Map(
        toArray(enrichedItems).map((item) => {
          if (!item || typeof item !== "object") return [null, null];
          const key = normalizeKey(item.xid || item.name);
          return key ? [key, item] : [null, null];
        }).filter(([key]) => Boolean(key))
      );

      return toArray(baseItems).map((item) => {
        if (!item || typeof item !== "object") return item;
        const key = normalizeKey(item.xid || item.name);
        const enriched = key ? enrichedMap.get(key) : null;
        return enriched ? { ...item, ...enriched, xid: item.xid || enriched.xid, name: item.name || enriched.name } : item;
      });
    }

    function mergeVerifiedData(plan, verifiedContext, weatherContext, routingContext) {
      return {
        ...plan,
        attractions: mergeByIdentity(verifiedContext.attractions, plan?.attractions),
        restaurants: mergeByIdentity(verifiedContext.restaurants, plan?.restaurants),
        must_try_foods: plan?.must_try_foods || [],
        climate_note: weatherContext?.climate_note || plan?.climate_note,
        safety_alerts: weatherContext?.safety_alerts || plan?.safety_alerts || [],
        packing_list: weatherContext?.packing_list || plan?.packing_list || {},
        route_optimization: routingContext || plan?.route_optimization || null,
      };
    }

    function parseTripDates(startDate, endDate) {
      const start = new Date(`${startDate}T00:00:00Z`);
      const end = new Date(`${endDate}T00:00:00Z`);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        return { error: "Dates must be valid ISO dates" };
      }

      if (end < start) {
        return { error: "End date must be on or after start date" };
      }

      const days = Math.floor((end - start) / 86400000) + 1;
      return { days };
    }

    function logInfo(message, data = {}) {
      console.log(`[plan-api] ${message}`, data);
    }

    function logError(message, error, data = {}) {
      console.error(`[plan-api] ${message}`, {
        ...data,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    export async function POST(req) {
      const ip = req.headers.get("x-forwarded-for") || "local";
      if (!rateLimit(ip)) {
        logInfo("rate limit blocked", { ip });
        return NextResponse.json({ error: "Too many requests" }, { status: 429 });
      }

      try {
        const body = await req.json();
        const { from, to, startDate, endDate, budget = "medium", travelType = "couple", interests = [] } = body;
        logInfo("request received", {
          ip,
          from,
          to,
          startDate,
          endDate,
          budget,
          travelType,
          interests_count: interests.length,
        });

        if (!to || !startDate || !endDate) {
          logInfo("missing required fields", { to, startDate, endDate });
          return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const tripDates = parseTripDates(startDate, endDate);
        if (tripDates.error) {
          logInfo("date validation failed", { startDate, endDate, error: tripDates.error });
          return NextResponse.json({ error: tripDates.error }, { status: 400 });
        }
        const { days } = tripDates;
        logInfo("trip dates parsed", { days });

        const cacheKey = keyOf({ from, to, startDate, endDate, budget, travelType, interests });
        if (cache.has(cacheKey)) {
          const cached = cache.get(cacheKey);
          logInfo("cache hit", {
            provider: cached?._meta?.provider,
            verified_places: cached?._meta?.verified_places,
            mapbox_routing: cached?._meta?.mapbox_routing,
          });
          return NextResponse.json({
            ...cached,
            _meta: { ...cached._meta, provider: "cache" }
          });
        }
        logInfo("cache miss", { to, days });

        const errors = [];
        let verifiedContext = null;
        try {
          verifiedContext = await fetchDestinationContext(to);
          logInfo("opentripmap success", {
            destination: verifiedContext?.destination?.name,
            attractions: verifiedContext?.attractions?.length || 0,
            restaurants: verifiedContext?.restaurants?.length || 0,
          });
        } catch (e) {
          errors.push("OpenTripMap lookup failed");
          logError("opentripmap failed", e, { to });
        }

        let weatherContext = null;
        if (verifiedContext?.destination) {
          try {
            weatherContext = await fetchWeatherContext(
              verifiedContext.destination.lat,
              verifiedContext.destination.lon,
              startDate,
              endDate
            );
            logInfo("open-meteo success", {
              forecast_days: weatherContext?.forecast_days?.length || 0,
              alerts: weatherContext?.safety_alerts?.length || 0,
            });
          } catch (e) {
            errors.push("Open-Meteo lookup failed");
            logError("open-meteo failed", e, {
              lat: verifiedContext.destination.lat,
              lon: verifiedContext.destination.lon,
              startDate,
              endDate,
            });
          }
        }

        let routingContext = null;
        if (verifiedContext?.destination) {
          try {
            routingContext = await buildRoutingContext(
              verifiedContext.destination,
              [...(verifiedContext.attractions || []), ...(verifiedContext.restaurants || [])]
            );
            logInfo("mapbox success", {
              ordered_places: routingContext?.ordered_places?.length || 0,
              route_note: routingContext?.route_note,
            });
          } catch (e) {
            errors.push("Mapbox routing failed");
            logError("mapbox failed", e, {
              destination: verifiedContext.destination.name,
            });
          }
        }

        const systemPrompt = buildSystemPrompt();
        const userPrompt = buildUserPrompt(
          { from, to, startDate, endDate, budget, travelType, interests },
          days,
          verifiedContext || { attractions: [], restaurants: [] },
          weatherContext,
          routingContext
        );

        let plan = null;
        let provider = null;
        const modelStatus = {
          groq: {
            attempted: false,
            success: false,
            schema_valid: false,
            error: null,
          },
          gemini: {
            attempted: false,
            success: false,
            schema_valid: false,
            error: null,
          },
        };
        let groqPlan = null;
        let geminiPlan = null;
        let groqSchemaValid = false;
        let geminiSchemaValid = false;

        // 1) Groq primary attempt
        try {
          modelStatus.groq.attempted = true;
          logInfo("calling groq", { to, days });
          const groqData = sanitizePlan(await callGroq(systemPrompt, userPrompt), days);
          const parsed = PlanSchema.safeParse(groqData);
          groqPlan = verifiedContext ? mergeVerifiedData(groqData, verifiedContext, weatherContext, routingContext) : groqData;
          groqSchemaValid = parsed.success;
          modelStatus.groq.success = true;
          modelStatus.groq.schema_valid = parsed.success;
          if (parsed.success) {
            plan = groqPlan;
            provider = "groq";
            logInfo("groq success", {
              itinerary_days: plan?.itinerary?.length || 0,
              transport_options: plan?.transport_options?.length || 0,
            });
          } else {
            plan = groqPlan;
            errors.push("Groq schema invalid");
            logInfo("groq schema invalid", {
              issues: parsed.error.issues.map((issue) => issue.path.join(".")).slice(0, 10),
            });
          }
        } catch (e) {
          modelStatus.groq.error = e instanceof Error ? e.message : String(e);
          errors.push(`Groq failed: ${modelStatus.groq.error}`);
          logError("groq failed", e, { to, days });
        }

        // 2) Gemini independent attempt
        try {
          modelStatus.gemini.attempted = true;
          logInfo("calling gemini", {
            to,
            days,
            has_gemini_key: Boolean(process.env.GEMINI_API_KEY),
            model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
          });
          const geminiData = sanitizePlan(await callGemini(systemPrompt, userPrompt), days);
          const parsed = PlanSchema.safeParse(geminiData);
          geminiPlan = verifiedContext ? mergeVerifiedData(geminiData, verifiedContext, weatherContext, routingContext) : geminiData;
          geminiSchemaValid = parsed.success;
          modelStatus.gemini.success = true;
          modelStatus.gemini.schema_valid = parsed.success;
          if (parsed.success) {
            logInfo("gemini success", {
              itinerary_days: geminiPlan?.itinerary?.length || 0,
              transport_options: geminiPlan?.transport_options?.length || 0,
            });
          } else {
            errors.push("Gemini schema invalid");
            logInfo("gemini schema invalid", {
              issues: parsed.error.issues.map((issue) => issue.path.join(".")).slice(0, 10),
            });
          }
        } catch (e) {
          modelStatus.gemini.error = e instanceof Error ? e.message : String(e);
          errors.push(`Gemini failed: ${modelStatus.gemini.error}`);
          logError("gemini failed", e, {
            to,
            days,
            has_gemini_key: Boolean(process.env.GEMINI_API_KEY),
          });
        }

        // 3) Gemini repair if Groq output still needs help
        const needsRepair = !plan || !PlanSchema.safeParse(plan).success;
        if (needsRepair && geminiSchemaValid && geminiPlan) {
          plan = geminiPlan;
          provider = "gemini";
          logInfo("using gemini plan as repair", {
            itinerary_days: plan?.itinerary?.length || 0,
          });
        } else if (!provider && groqPlan) {
          plan = groqPlan;
          provider = groqSchemaValid ? "groq" : "groq-partial";
        } else if (!provider && geminiPlan) {
          plan = geminiPlan;
          provider = geminiSchemaValid ? "gemini" : "gemini-partial";
        }

        // 4) Final safety net
        if (!plan || !plan.itinerary || plan.itinerary.length === 0) {
          const orderedPlaces = routingContext?.ordered_places || [];
          const topAttraction = orderedPlaces?.[0]?.name || verifiedContext?.attractions?.[0]?.name || `Top highlight in ${to}`;
          const secondAttraction = orderedPlaces?.[1]?.name || verifiedContext?.attractions?.[1]?.name || topAttraction;
          const topRestaurant = verifiedContext?.restaurants?.[0]?.name || `Well-rated local dining in ${to}`;
          const firstTransfer =
            routingContext?.travel_pairs?.[`${topAttraction}__${secondAttraction}`]?.duration_label ||
            "short transfer";
          const secondTransfer =
            routingContext?.travel_pairs?.[`${secondAttraction}__${topRestaurant}`]?.duration_label ||
            "easy evening transfer";
          const fallbackItinerary = Array.from({ length: days }, (_, index) => {
            const dayNumber = index + 1;
            const isArrival = index === 0;
            const isDeparture = index === days - 1 && days > 1;
            return {
              day: dayNumber,
              date: `Day ${dayNumber}`,
              theme: isArrival ? "Arrival and orientation" : isDeparture ? "Wrap-up and departure" : `Discover ${to}`,
              morning: {
                title: isArrival ? `Arrive and settle into ${to}` : `Slow start around ${topAttraction}`,
                description: isArrival
                  ? `Check in, get oriented, and ease into the pace of ${to} with a neighborhood walk.`
                  : `Spend the morning around one of the destination's strongest highlights and nearby streets.`,
                location: isArrival ? to : topAttraction,
                duration: "2-3 hours",
                tips: "Keep the first half of the day flexible for traffic, check-in timing, and energy level.",
                tags: ["Practical", "Morning"],
              },
              afternoon: {
                title: `Explore ${secondAttraction}`,
                description: `Use the afternoon for sightseeing, a relaxed lunch break, and time to absorb the local atmosphere.`,
                location: secondAttraction,
                duration: firstTransfer,
                tips: "Cluster nearby stops together so you avoid backtracking.",
                tags: ["Sightseeing", "Afternoon"],
              },
              evening: {
                title: `Dinner and unwind in ${to}`,
                description: `Finish with a comfortable dinner plan and a low-stress evening suited to your ${travelType} trip style.`,
                location: topRestaurant,
                duration: secondTransfer,
                tips: "Choose a shorter evening transfer so the day ends smoothly.",
                tags: ["Evening", "Food"],
              },
            };
          });
          plan = {
            destination_summary: `A detailed ${days}-day plan for ${to}, balancing sightseeing, meals, and practical pacing for a ${travelType} trip.`,
            climate_note: weatherContext?.climate_note || `Weather data was unavailable, so this plan uses practical seasonal assumptions for ${to}.`,
            attractions: verifiedContext?.attractions || [],
            restaurants: verifiedContext?.restaurants || [],
            must_try_foods: [
              {
                name: `Signature flavors of ${to}`,
                description: `Use this section to prioritize the most representative dishes and regional specialties during your stay in ${to}.`,
                best_time: "Across the trip",
                where_to_try: topRestaurant,
              },
            ],
            transport_options: [
              {
                mode: "Taxi",
                icon: "🚕",
                route: `Around ${to}`,
                duration: "Flexible",
                cost: "Varies by trip",
                recommended: true,
                note: "Simple option for direct transfers and flexible pacing.",
              },
              {
                mode: "Public transit",
                icon: "🚌",
                route: `Main local routes in ${to}`,
                duration: "Depends on network",
                cost: "Lower cost option",
                recommended: false,
                note: "Useful when you want to save money and travel at a slower pace.",
              },
            ],
            best_transport: routingContext?.route_note || `Use the simplest low-friction transfer option based on your budget and energy each day.`,
            budget_estimate: budget,
            safety_alerts: weatherContext?.safety_alerts || [],
            packing_list: weatherContext?.packing_list || {},
            local_transport: [
              {
                mode: "Taxi or rideshare",
                cost: "Varies by distance",
                recommendation: `Best for keeping a multi-stop day comfortable and flexible in ${to}.`,
              },
            ],
            stay_recommendations: [
              {
                area: to,
                description: "Stay in a central, well-connected area so mornings start easily and evenings stay low-stress.",
                good_for: [travelType, budget],
                price_range: budget,
              },
            ],
            booking_info: verifiedContext?.attractions?.slice(0, 3).map((item) => ({
              place: item.name,
              entry_fee: "Check official listing",
              timings: "Verify before visiting",
              advance_booking: "recommended",
            })) || [],
            local_tips: [
              "Keep one lighter half-day to avoid itinerary fatigue.",
              "Group nearby places together and leave room for spontaneous meals or café breaks.",
            ],
            alternative_dates: weatherContext?.forecast_days?.length
              ? [
                  {
                    range: `${startDate} to ${endDate}`,
                    score: "Current forecast window",
                    reasons: [weatherContext.climate_note],
                  },
                ]
              : [],
            route_optimization: routingContext || null,
            itinerary: fallbackItinerary,
          };
          provider = provider || "fallback";
          logInfo("using fallback itinerary", {
            topAttraction,
            secondAttraction,
            topRestaurant,
          });
        }

        if (verifiedContext) {
          plan = mergeVerifiedData(plan, verifiedContext, weatherContext, routingContext);
        }

        const result = {
          ...plan,
          _meta: {
            provider,
            repaired: provider === "gemini",
            errors,
            models: modelStatus,
            verified_places: Boolean(verifiedContext),
            mapbox_routing: Boolean(routingContext),
          }
        };
        logInfo("response ready", {
          provider,
          itinerary_days: result?.itinerary?.length || 0,
          errors,
          verified_places: result?._meta?.verified_places,
          mapbox_routing: result?._meta?.mapbox_routing,
        });
        cache.set(cacheKey, result);
        return NextResponse.json(result);
      } catch (err) {
        logError("unhandled server error", err);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
      }
    }
