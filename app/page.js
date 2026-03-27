"use client";

import { useEffect, useState } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600&display=swap');`;

const STYLES = `
  ${FONTS}
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --ink: #0d0d0d;
    --paper: #faf8f3;
    --warm: #f5f0e8;
    --cream: #ede8dc;
    --terracotta: #c8613a;
    --terra-light: #f0cabc;
    --gold: #c49a3c;
    --gold-light: #f5e9c8;
    --sage: #4a7c59;
    --sage-light: #d4e8da;
    --sky: #3a6b8a;
    --sky-light: #ccdfe8;
    --mist: #8a9bb0;
    --border: #d8d0c2;
    --shadow: rgba(13,13,13,0.08);
    --radius: 16px;
    --font-display: 'Playfair Display', serif;
    --font-body: 'DM Sans', sans-serif;
  }

  html { scroll-behavior: smooth; }
  body {
    font-family: var(--font-body);
    background:
      radial-gradient(circle at top left, rgba(240, 202, 188, 0.35), transparent 28%),
      radial-gradient(circle at top right, rgba(212, 232, 218, 0.45), transparent 26%),
      var(--paper);
    color: var(--ink);
    min-height: 100vh;
    line-height: 1.6;
  }
  .app-wrapper { min-height: 100vh; display: flex; flex-direction: column; }
  .header {
    padding: 20px 40px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(216, 208, 194, 0.7);
    background: rgba(250, 248, 243, 0.78);
    position: sticky;
    top: 0;
    z-index: 100;
    backdrop-filter: blur(14px);
  }
  .logo { display: flex; align-items: center; gap: 10px; }
  .logo-icon {
    width: 38px;
    height: 38px;
    background: linear-gradient(135deg, var(--terracotta), #de8b67);
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 18px;
    box-shadow: 0 10px 20px rgba(200, 97, 58, 0.18);
  }
  .logo-text {
    font-family: var(--font-display);
    font-size: 21px;
    font-weight: 700;
    color: var(--ink);
  }
  .logo-text span { color: var(--terracotta); }
  .header-side { display: flex; align-items: center; gap: 10px; }
  .header-tag {
    font-size: 12px;
    color: var(--mist);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 600;
  }
  .provider-pill {
    font-size: 11px;
    padding: 6px 10px;
    border-radius: 999px;
    border: 1px solid var(--border);
    background: white;
    color: #555;
  }
  .hero {
    padding: 88px 40px 64px;
    max-width: 920px;
    margin: 0 auto;
    text-align: center;
  }
  .hero-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--terracotta);
    font-weight: 700;
    margin-bottom: 22px;
    padding: 8px 16px;
    background: rgba(240, 202, 188, 0.6);
    border-radius: 100px;
    border: 1px solid rgba(200, 97, 58, 0.1);
  }
  .hero h1 {
    font-family: var(--font-display);
    font-size: clamp(38px, 5vw, 66px);
    line-height: 1.08;
    font-weight: 700;
    margin-bottom: 20px;
  }
  .hero h1 em { font-style: italic; color: var(--terracotta); }
  .hero p {
    font-size: 18px;
    color: #555;
    max-width: 620px;
    margin: 0 auto;
    line-height: 1.75;
  }
  .form-section { max-width: 920px; margin: 0 auto 88px; padding: 0 40px; }
  .error-banner {
    background: #fff4f1;
    border: 1px solid rgba(200, 97, 58, 0.22);
    border-radius: 14px;
    padding: 14px 18px;
    margin-bottom: 24px;
    color: #9f3d1b;
    font-size: 14px;
  }
  .step-nav {
    display: flex;
    align-items: center;
    margin-bottom: 40px;
    background: rgba(245, 240, 232, 0.8);
    border-radius: 100px;
    padding: 6px;
    border: 1px solid var(--border);
    overflow-x: auto;
  }
  .step-btn {
    flex: 1;
    padding: 10px 20px;
    border: none;
    background: transparent;
    border-radius: 100px;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    color: var(--mist);
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    white-space: nowrap;
  }
  .step-btn.active { background: var(--ink); color: white; box-shadow: 0 2px 8px var(--shadow); }
  .step-btn.done { color: var(--sage); }
  .step-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--cream);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .step-btn.active .step-dot { background: rgba(255,255,255,0.16); color: white; }
  .step-btn.done .step-dot { background: var(--sage-light); color: var(--sage); }
  .form-card {
    background: rgba(255, 255, 255, 0.82);
    border-radius: var(--radius);
    border: 1px solid rgba(216, 208, 194, 0.82);
    padding: 40px;
    box-shadow: 0 18px 36px var(--shadow);
    backdrop-filter: blur(14px);
  }
  .form-card h2 { font-family: var(--font-display); font-size: 28px; margin-bottom: 8px; }
  .subtitle { color: var(--mist); font-size: 14px; margin-bottom: 32px; }
  .field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
  .field { display: flex; flex-direction: column; gap: 8px; }
  .field label {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--mist);
  }
  .field input, .field select {
    padding: 14px 16px;
    border: 1.5px solid var(--border);
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 15px;
    color: var(--ink);
    background: rgba(250, 248, 243, 0.9);
    transition: border-color 0.2s, background 0.2s, transform 0.2s;
    outline: none;
  }
  .field input:focus, .field select:focus {
    border-color: var(--terracotta);
    background: white;
    transform: translateY(-1px);
  }
  .chip-group { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 4px; }
  .chip {
    padding: 9px 18px;
    border-radius: 100px;
    border: 1.5px solid var(--border);
    background: white;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    color: #666;
    cursor: pointer;
    transition: all 0.2s;
  }
  .chip:hover { border-color: var(--terracotta); color: var(--terracotta); }
  .chip.selected {
    background: var(--terracotta);
    border-color: var(--terracotta);
    color: white;
    box-shadow: 0 10px 20px rgba(200, 97, 58, 0.2);
  }
  .form-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    margin-top: 36px;
    padding-top: 28px;
    border-top: 1px solid var(--border);
    flex-wrap: wrap;
  }
  .btn {
    padding: 12px 28px;
    border-radius: 12px;
    font-family: var(--font-body);
    font-size: 15px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .btn-primary { background: var(--terracotta); color: white; }
  .btn-ghost {
    background: transparent;
    color: var(--mist);
    border: 1.5px solid var(--border);
  }
  .btn-generate { background: var(--ink); color: white; padding: 14px 36px; font-size: 16px; border-radius: 14px; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .loading-screen {
    max-width: 620px;
    margin: 60px auto;
    padding: 0 40px;
    text-align: center;
  }
  .loading-globe {
    width: 80px;
    height: 80px;
    margin: 0 auto 28px;
  }
  .loading-globe svg {
    animation: spin 3s linear infinite;
    filter: drop-shadow(0 10px 24px rgba(200, 97, 58, 0.14));
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loading-title { font-family: var(--font-display); font-size: 30px; margin-bottom: 12px; }
  .loading-sub { color: var(--mist); font-size: 15px; margin-bottom: 36px; }
  .loading-steps {
    display: flex;
    flex-direction: column;
    gap: 10px;
    text-align: left;
    background: rgba(255, 255, 255, 0.84);
    border-radius: var(--radius);
    padding: 24px;
    border: 1px solid var(--border);
    box-shadow: 0 18px 36px var(--shadow);
    backdrop-filter: blur(12px);
  }
  .loading-step {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    color: var(--mist);
  }
  .loading-step.done { color: var(--sage); }
  .loading-step.active { color: var(--ink); font-weight: 600; }
  .ls-icon { width: 20px; font-size: 16px; flex-shrink: 0; }
  .spinner-sm {
    width: 16px;
    height: 16px;
    border: 2px solid var(--border);
    border-top-color: var(--terracotta);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }
  .results-wrapper {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 40px 80px;
  }
  .results-header {
    padding: 40px 0 32px;
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 20px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border);
    margin-bottom: 40px;
  }
  .results-title {
    font-family: var(--font-display);
    font-size: clamp(30px, 4vw, 50px);
    line-height: 1.2;
  }
  .results-title span { color: var(--terracotta); font-style: italic; }
  .trip-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    margin-top: 12px;
  }
  .meta-tag {
    padding: 6px 12px;
    background: rgba(245, 240, 232, 0.9);
    border-radius: 100px;
    font-size: 12px;
    font-weight: 600;
    color: #555;
    border: 1px solid var(--border);
  }
  .results-tabs {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    padding-bottom: 2px;
    margin-bottom: 32px;
    border-bottom: 2px solid var(--border);
    scrollbar-width: none;
  }
  .results-tabs::-webkit-scrollbar { display: none; }
  .tab-btn {
    padding: 10px 18px;
    border: none;
    background: transparent;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    color: var(--mist);
    cursor: pointer;
    white-space: nowrap;
    border-bottom: 2px solid transparent;
    margin-bottom: -2px;
    transition: all 0.2s;
    border-radius: 8px 8px 0 0;
  }
  .tab-btn:hover { color: var(--ink); background: rgba(245,240,232,0.9); }
  .tab-btn.active { color: var(--terracotta); border-bottom-color: var(--terracotta); font-weight: 700; }
  .section-card {
    background: rgba(255, 255, 255, 0.84);
    border-radius: var(--radius);
    border: 1px solid var(--border);
    margin-bottom: 24px;
    overflow: hidden;
    box-shadow: 0 18px 36px var(--shadow);
    backdrop-filter: blur(14px);
  }
  .card-header {
    padding: 24px 28px 20px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 14px;
  }
  .card-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }
  .card-icon.terra { background: var(--terra-light); }
  .card-icon.gold { background: var(--gold-light); }
  .card-icon.sky { background: var(--sky-light); }
  .card-icon.sage { background: var(--sage-light); }
  .card-title { font-family: var(--font-display); font-size: 20px; font-weight: 700; }
  .card-subtitle { font-size: 13px; color: var(--mist); margin-top: 2px; }
  .card-body { padding: 28px; }
  .day-tabs { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; }
  .day-tab {
    padding: 8px 18px;
    border-radius: 100px;
    border: 1.5px solid var(--border);
    background: white;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    color: #666;
  }
  .day-tab.active { background: var(--ink); color: white; border-color: var(--ink); }
  .timeline { position: relative; padding-left: 28px; }
  .timeline::before {
    content: "";
    position: absolute;
    left: 8px;
    top: 8px;
    bottom: 8px;
    width: 2px;
    background: var(--border);
    border-radius: 2px;
  }
  .timeline-item { position: relative; margin-bottom: 24px; }
  .timeline-dot {
    position: absolute;
    left: -24px;
    top: 14px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid white;
  }
  .timeline-dot.morning { background: var(--gold); box-shadow: 0 0 0 2px var(--gold); }
  .timeline-dot.afternoon { background: var(--terracotta); box-shadow: 0 0 0 2px var(--terracotta); }
  .timeline-dot.evening { background: var(--sky); box-shadow: 0 0 0 2px var(--sky); }
  .tl-card {
    background: rgba(245, 240, 232, 0.85);
    border-radius: 12px;
    padding: 16px 20px;
    border: 1px solid var(--border);
  }
  .tl-period {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 8px;
  }
  .tl-period.morning { color: var(--gold); }
  .tl-period.afternoon { color: var(--terracotta); }
  .tl-period.evening { color: var(--sky); }
  .tl-title { font-weight: 700; font-size: 16px; margin-bottom: 6px; }
  .tl-desc { font-size: 13px; color: #666; line-height: 1.6; margin-bottom: 10px; }
  .tl-tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .tl-tag {
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 600;
    background: white;
    border: 1px solid var(--border);
    color: #666;
  }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .info-block {
    background: rgba(245, 240, 232, 0.82);
    border-radius: 12px;
    padding: 18px 20px;
    border: 1px solid var(--border);
  }
  .info-block h4 {
    font-size: 13px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--mist);
    margin-bottom: 10px;
  }
  .empty-state {
    padding: 18px 20px;
    border-radius: 12px;
    border: 1px dashed var(--border);
    background: rgba(245, 240, 232, 0.55);
    color: #666;
    font-size: 14px;
  }
  .transport-card {
    display: flex;
    align-items: flex-start;
    gap: 16px;
    padding: 16px 20px;
    border-radius: 12px;
    border: 1.5px solid var(--border);
    background: white;
    margin-bottom: 12px;
  }
  .transport-card.recommended { border-color: var(--gold); background: rgba(196,154,60,0.04); }
  .transport-icon { font-size: 28px; flex-shrink: 0; }
  .transport-info { flex: 1; }
  .transport-name { font-weight: 700; font-size: 15px; margin-bottom: 4px; }
  .transport-detail { font-size: 13px; color: #666; }
  .transport-badge {
    padding: 3px 10px;
    border-radius: 100px;
    font-size: 11px;
    font-weight: 700;
    background: var(--gold-light);
    color: #8a6618;
  }
  .budget-row { display: flex; align-items: center; gap: 14px; margin-bottom: 12px; }
  .budget-label { font-size: 14px; font-weight: 600; width: 110px; flex-shrink: 0; }
  .budget-bar-wrap {
    flex: 1;
    height: 8px;
    background: var(--cream);
    border-radius: 100px;
    overflow: hidden;
  }
  .budget-bar { height: 100%; border-radius: 100px; }
  .budget-amount { font-size: 14px; font-weight: 700; width: 110px; text-align: right; flex-shrink: 0; }
  .list-stack { display: flex; flex-direction: column; gap: 12px; }
  .list-item {
    padding: 16px 18px;
    background: rgba(245, 240, 232, 0.78);
    border-radius: 12px;
    border: 1px solid var(--border);
  }
  .list-item-title { font-weight: 700; margin-bottom: 4px; }
  .list-item-sub { color: #666; font-size: 13px; }
  .source-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
  }
  .source-badge {
    padding: 5px 10px;
    border-radius: 999px;
    background: white;
    border: 1px solid var(--border);
    font-size: 11px;
    font-weight: 700;
    color: #666;
  }
  .route-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .route-stop {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 12px;
    background: rgba(245, 240, 232, 0.82);
    border: 1px solid var(--border);
  }
  .route-num {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--ink);
    color: white;
    font-size: 12px;
    font-weight: 700;
    flex-shrink: 0;
  }
  .kv-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }
  .pill-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .pill {
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(245, 240, 232, 0.85);
    border: 1px solid var(--border);
    font-size: 12px;
    color: #555;
  }
  @media (max-width: 768px) {
    .header { padding: 16px 20px; }
    .hero { padding: 56px 20px 42px; }
    .form-section { padding: 0 20px; }
    .results-wrapper { padding: 0 20px 60px; }
    .field-row, .grid-2, .kv-grid { grid-template-columns: 1fr; }
    .step-btn span.step-label { display: none; }
    .form-card { padding: 24px 20px; }
    .card-body { padding: 20px; }
    .hero p { font-size: 16px; }
    .header-side { flex-direction: column; align-items: flex-end; }
  }
`;

const BUDGET_OPTIONS = [
  { id: "budget", label: "Budget" },
  { id: "medium", label: "Mid-range" },
  { id: "luxury", label: "Luxury" },
];

const TRAVEL_TYPES = [
  { id: "solo", label: "Solo" },
  { id: "couple", label: "Couple" },
  { id: "friends", label: "Friends" },
  { id: "family", label: "Family" },
];

const INTERESTS = [
  { id: "food", label: "Food" },
  { id: "adventure", label: "Adventure" },
  { id: "culture", label: "Culture" },
  { id: "nature", label: "Nature" },
  { id: "chill", label: "Chill" },
  { id: "nightlife", label: "Nightlife" },
  { id: "shopping", label: "Shopping" },
  { id: "history", label: "History" },
];

const RESULT_TABS = [
  { id: "itinerary", label: "Itinerary" },
  { id: "insights", label: "Insights" },
  { id: "transport", label: "Getting There" },
  { id: "weather", label: "Weather & Packing" },
  { id: "stay", label: "Stay & Booking" },
  { id: "route", label: "Route" },
  { id: "budget", label: "Budget" },
];

const LOADING_STEPS = [
  { icon: "🌍", label: "Analyzing destination and dates..." },
  { icon: "🗺️", label: "Mapping top attractions..." },
  { icon: "🍽️", label: "Curating restaurants and experiences..." },
  { icon: "🚆", label: "Considering transport options..." },
  { icon: "💰", label: "Estimating trip budget..." },
  { icon: "✨", label: "Composing your final itinerary..." },
];

function titleCase(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDateRange(startDate, endDate) {
  if (!startDate || !endDate) return "";
  try {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const fmt = new Intl.DateTimeFormat("en", { month: "short", day: "numeric" });
    return `${fmt.format(start)} - ${fmt.format(end)}`;
  } catch {
    return `${startDate} - ${endDate}`;
  }
}

function getTripDays(startDate, endDate) {
  if (!startDate || !endDate) return 1;
  try {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    const diff = Math.floor((end - start) / 86400000) + 1;
    return Number.isFinite(diff) && diff > 0 ? diff : 1;
  } catch {
    return 1;
  }
}

function normalizeAttractions(items) {
  const seen = new Set();
  return toArray(items)
    .map((item, index) =>
      typeof item === "string"
        ? { name: item, category: `Highlight ${index + 1}`, description: "A recommended stop for this trip.", best_time: "Flexible" }
        : {
            name: item?.name || `Attraction ${index + 1}`,
            category: item?.category || "Must-see",
            description: item?.description || "Worth adding to your route.",
            best_time: item?.best_time || "Flexible",
          }
    )
    .filter((item) => {
      const key = `${String(item.name || "").toLowerCase()}::${String(item.description || "").slice(0, 80).toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeRestaurants(items) {
  return toArray(items).map((item, index) =>
    typeof item === "string"
      ? { name: item, cuisine: "Local", signature_dish: "Chef recommendation", budget_level: "Varies", neighborhood: "Central area" }
      : {
          name: item?.name || `Restaurant ${index + 1}`,
          cuisine: item?.cuisine || "Local",
          signature_dish: item?.signature_dish || "House specialty",
          budget_level: item?.budget_level || "Varies",
          neighborhood: item?.neighborhood || "Popular district",
        }
  );
}

function normalizeFoods(items) {
  return toArray(items).map((item, index) =>
    typeof item === "string"
      ? {
          name: item,
          description: "A regional specialty worth adding to your food list.",
          best_time: "Anytime",
          where_to_try: "Popular local dining areas",
        }
      : {
          name: item?.name || item?.dish || `Local dish ${index + 1}`,
          description: item?.description || "A representative local flavor to try during the trip.",
          best_time: item?.best_time || "Anytime",
          where_to_try: item?.where_to_try || "Popular local dining areas",
        }
  );
}

function normalizeTransport(items) {
  return toArray(items).map((item, index) =>
    typeof item === "string"
      ? { mode: item, icon: index === 0 ? "✈️" : "🚆", route: "Route details can vary", duration: "Depends on departure", cost: "Check live fares", recommended: index === 0 }
      : {
          mode: item?.mode || `Option ${index + 1}`,
          icon: item?.icon || (index === 0 ? "✈️" : "🚆"),
          route: item?.route || "Route details can vary",
          duration: item?.duration || "Depends on departure",
          cost: item?.cost || "Check live fares",
          recommended: Boolean(item?.recommended),
          note: item?.note || "",
        }
  );
}

function normalizeItinerary(items) {
  return toArray(items).map((day, index) => {
    const makeSlot = (slot, title, tag) => {
      if (typeof slot === "string") {
        return {
          title,
          description: slot,
          duration: "Flexible window",
          location: "",
          tips: "",
          tags: [tag],
        };
      }
      return {
        title: slot?.title || title,
        description: slot?.description || slot?.title || "Built from the planner response and ready to refine.",
        duration: slot?.duration || "Flexible window",
        location: slot?.location || "",
        tips: slot?.tips || "",
        tags: Array.isArray(slot?.tags) && slot.tags.length > 0 ? slot.tags : [tag],
      };
    };
    return {
      day: day?.day || index + 1,
      date: day?.date || `Day ${index + 1}`,
      theme: day?.theme || "Explore",
      morning: makeSlot(day?.morning, "Start with a signature local experience", "Morning"),
      afternoon: makeSlot(day?.afternoon, "Keep the pace with a central highlight", "Afternoon"),
      evening: makeSlot(day?.evening, "Wrap up with food or a scenic walk", "Evening"),
    };
  });
}

function buildBudget(plan, form) {
  if (plan?.budget && typeof plan.budget === "object") {
    return {
      ...plan.budget,
      currency: "INR",
    };
  }

  const days = getTripDays(form.startDate, form.endDate);
  const presets = {
    budget: {
      currency: "INR",
      travelBase: 3500,
      stayPerNight: 1800,
      foodPerDay: 900,
      activitiesPerDay: 700,
    },
    medium: {
      currency: "INR",
      travelBase: 6500,
      stayPerNight: 3800,
      foodPerDay: 1600,
      activitiesPerDay: 1300,
    },
    luxury: {
      currency: "INR",
      travelBase: 14000,
      stayPerNight: 9500,
      foodPerDay: 3200,
      activitiesPerDay: 2600,
    },
  };
  const selected = presets[form.budget] || presets.medium;
  const nights = Math.max(1, days - 1);
  const travel = selected.travelBase;
  const accommodation = selected.stayPerNight * nights;
  const food = selected.foodPerDay * days;
  const activities = selected.activitiesPerDay * days;
  const total = travel + accommodation + food + activities;

  return {
    currency: selected.currency,
    travel: { amount: travel, note: `Estimated intercity travel for ${form.to} in INR.` },
    accommodation: { amount: accommodation, note: `${nights} night${nights > 1 ? "s" : ""} based on a ${form.budget} stay style.` },
    food: { amount: food, note: `${days} day${days > 1 ? "s" : ""} of meals, snacks, and one or two nicer stops.` },
    activities: { amount: activities, note: "Entry tickets, local experiences, and sightseeing buffer." },
    total,
    saving_tips: plan?.budget_estimate
      ? [plan.budget_estimate]
      : [`For ${days} days in ${form.to}, this is a practical ${form.budget} estimate in INR. Stay slightly outside the busiest zone to lower the total.`],
  };
}

function normalizeSimpleList(items, fallbackKey) {
  return toArray(items).map((item, index) =>
    typeof item === "string" ? { [fallbackKey]: item } : { ...item, [fallbackKey]: item?.[fallbackKey] || `${fallbackKey} ${index + 1}` }
  );
}

function toArray(items) {
  if (Array.isArray(items)) return items;
  if (!items) return [];
  if (typeof items === "object") return Object.values(items);
  return [items];
}

export default function Page() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    from: "",
    to: "",
    startDate: "",
    endDate: "",
    budget: "medium",
    travelType: "couple",
    interests: ["culture", "food"],
  });
  const [phase, setPhase] = useState("form");
  const [loadStep, setLoadStep] = useState(0);
  const [plan, setPlan] = useState(null);
  const [activeTab, setActiveTab] = useState("itinerary");
  const [activeDay, setActiveDay] = useState(0);
  const [error, setError] = useState("");
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    if (phase !== "loading") return undefined;
    setLoadStep(0);
    const interval = setInterval(() => {
      setLoadStep((current) => {
        if (current >= LOADING_STEPS.length - 1) {
          clearInterval(interval);
          return current;
        }
        return current + 1;
      });
    }, 850);
    return () => clearInterval(interval);
  }, [phase]);

  const toggleInterest = (id) => {
    setForm((current) => ({
      ...current,
      interests: current.interests.includes(id)
        ? current.interests.filter((item) => item !== id)
        : [...current.interests, id],
    }));
  };

  const handleGenerate = async () => {
    setError("");
    setPhase("loading");
    console.log("[ui] generate requested", {
      from: form.from,
      to: form.to,
      startDate: form.startDate,
      endDate: form.endDate,
      budget: form.budget,
      travelType: form.travelType,
      interests: form.interests,
    });
    try {
      const response = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      console.log("[ui] api response received", {
        status: response.status,
        ok: response.ok,
        provider: data?._meta?.provider,
        errors: data?._meta?.errors,
      });
      if (!response.ok || data?.error) throw new Error(data?.error || "Failed to generate plan");
      setPlan(data);
      setMeta(data?._meta || null);
      setActiveDay(0);
      setActiveTab("itinerary");
      setPhase("results");
      console.log("[ui] plan rendered", {
        itineraryDays: data?.itinerary?.length || 0,
        verifiedPlaces: data?._meta?.verified_places,
        mapboxRouting: data?._meta?.mapbox_routing,
      });
    } catch (err) {
      console.error("[ui] generate failed", err);
      setPlan(null);
      setMeta(null);
      setPhase("form");
      setError(err.message || "Failed to generate plan");
    }
  };

  const resetApp = () => {
    setPlan(null);
    setMeta(null);
    setPhase("form");
    setStep(0);
    setActiveTab("itinerary");
    setActiveDay(0);
    setError("");
  };

  const normalizedPlan = plan
    ? {
        itinerary: normalizeItinerary(plan.itinerary),
        attractions: normalizeAttractions(plan.attractions),
        restaurants: normalizeRestaurants(plan.restaurants),
        must_try_foods: normalizeFoods(plan.must_try_foods),
        transport_options: normalizeTransport(plan.transport_options),
        budget: buildBudget(plan, form),
        destination_summary: plan.destination_summary || `A tailored trip to ${form.to}.`,
        climate_note: plan.climate_note || "",
        safety_alerts: plan.safety_alerts || [],
        packing_list: plan.packing_list || {},
        stay_recommendations: normalizeSimpleList(plan.stay_recommendations, "area"),
        booking_info: normalizeSimpleList(plan.booking_info, "place"),
        local_transport: normalizeSimpleList(plan.local_transport, "mode"),
        local_tips: toArray(plan.local_tips).map((tip) => (typeof tip === "string" ? tip : tip?.tip || tip?.text || String(tip))),
        alternative_dates: toArray(plan.alternative_dates),
        best_transport: plan.best_transport || "",
        route_optimization: plan.route_optimization || null,
      }
    : null;

  const currentDay = normalizedPlan?.itinerary?.[activeDay];
  const tripWindow = formatDateRange(form.startDate, form.endDate);

  return (
    <>
      <div className="app-wrapper">
        <header className="header">
          <div className="logo">
            <div className="logo-icon">✈</div>
            <div className="logo-text">AI<span>Travel</span></div>
          </div>
          <div className="header-side">
            <span className="header-tag">Smart Travel Planner</span>
            {meta?.provider && <span className="provider-pill">{meta.provider}{meta?.repaired ? " repaired" : ""}</span>}
          </div>
        </header>

        {phase === "form" && (
          <>
            <div className="hero">
              <div className="hero-eyebrow">AI-Powered Planning</div>
              <h1>Your <em>beautiful trip</em>,<br />planned in seconds.</h1>
              <p>Tell us where you are going and how you like to travel. We will turn that into a polished itinerary with transport, dining, and budget ideas.</p>
            </div>

            <div className="form-section">
              {error && <div className="error-banner">{error}</div>}

              <div className="step-nav">
                {["Where & When", "Preferences"].map((label, index) => (
                  <button key={label} type="button" className={`step-btn ${step === index ? "active" : ""} ${step > index ? "done" : ""}`} onClick={() => setStep(index)}>
                    <div className="step-dot">{step > index ? "✓" : index + 1}</div>
                    <span className="step-label">{label}</span>
                  </button>
                ))}
              </div>

              {step === 0 && (
                <div className="form-card">
                  <h2>Where are you headed?</h2>
                  <p className="subtitle">Start with your route and your travel window.</p>

                  <div className="field-row">
                    <div className="field">
                      <label>Traveling From</label>
                      <input value={form.from} onChange={(event) => setForm((current) => ({ ...current, from: event.target.value }))} placeholder="e.g. Mumbai, India" />
                    </div>
                    <div className="field">
                      <label>Destination</label>
                      <input value={form.to} onChange={(event) => setForm((current) => ({ ...current, to: event.target.value }))} placeholder="e.g. Paris, France" />
                    </div>
                  </div>

                  <div className="field-row">
                    <div className="field">
                      <label>Start Date</label>
                      <input type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} />
                    </div>
                    <div className="field">
                      <label>End Date</label>
                      <input type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} />
                    </div>
                  </div>

                  <div className="form-footer">
                    <span style={{ fontSize: 13, color: "var(--mist)" }}>Step 1 of 2</span>
                    <button type="button" className="btn btn-primary" onClick={() => setStep(1)} disabled={!form.to || !form.startDate || !form.endDate}>
                      Next: Preferences
                    </button>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="form-card">
                  <h2>Personalize your trip</h2>
                  <p className="subtitle">Choose the pace, style, and interests you care about most.</p>

                  <div className="field" style={{ marginBottom: 24 }}>
                    <label>Budget Level</label>
                    <div className="chip-group">
                      {BUDGET_OPTIONS.map((option) => (
                        <button key={option.id} type="button" className={`chip ${form.budget === option.id ? "selected" : ""}`} onClick={() => setForm((current) => ({ ...current, budget: option.id }))}>
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field" style={{ marginBottom: 24 }}>
                    <label>Travel Type</label>
                    <div className="chip-group">
                      {TRAVEL_TYPES.map((option) => (
                        <button key={option.id} type="button" className={`chip ${form.travelType === option.id ? "selected" : ""}`} onClick={() => setForm((current) => ({ ...current, travelType: option.id }))}>
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="field">
                    <label>Interests</label>
                    <div className="chip-group">
                      {INTERESTS.map((interest) => (
                        <button key={interest.id} type="button" className={`chip ${form.interests.includes(interest.id) ? "selected" : ""}`} onClick={() => toggleInterest(interest.id)}>
                          {interest.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-footer">
                    <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>Back</button>
                    <button type="button" className="btn btn-generate" onClick={handleGenerate} disabled={!form.to || !form.startDate || !form.endDate}>
                      Generate My Trip Plan
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {phase === "loading" && (
          <div className="loading-screen">
            <div className="loading-globe">
              <svg width="80" height="80" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="4" />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  fill="none"
                  stroke="var(--terracotta)"
                  strokeWidth="4"
                  strokeDasharray="60 154"
                  strokeLinecap="round"
                />
                <text x="40" y="46" textAnchor="middle" fontSize="22">
                  ✈
                </text>
              </svg>
            </div>
            <h2 className="loading-title">Building your dream trip...</h2>
            <p className="loading-sub">
              Crafting a personalized plan for <strong>{form.to}</strong>
            </p>

            <div className="loading-steps">
              {LOADING_STEPS.map((item, index) => (
                <div
                  key={item.label}
                  className={`loading-step ${index < loadStep ? "done" : index === loadStep ? "active" : ""}`}
                >
                  {index < loadStep ? (
                    <span className="ls-icon">✓</span>
                  ) : index === loadStep ? (
                    <div className="spinner-sm" />
                  ) : (
                    <span className="ls-icon">{item.icon}</span>
                  )}
                  {item.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {phase === "results" && normalizedPlan && (
          <div className="results-wrapper">
            <div className="results-header">
              <div>
                <div className="results-title">
                  Your trip to <span>{form.to}</span>
                </div>
                <div className="trip-meta">
                  {form.from && <span className="meta-tag">From {form.from}</span>}
                  {tripWindow && <span className="meta-tag">{tripWindow}</span>}
                  <span className="meta-tag">{titleCase(form.budget)}</span>
                  <span className="meta-tag">{titleCase(form.travelType)}</span>
                </div>
              </div>
              <button type="button" className="btn btn-ghost" onClick={resetApp}>
                New Trip
              </button>
            </div>

            <div className="section-card">
              <div className="card-body">
                <div className="results-title" style={{ fontSize: "clamp(26px, 3vw, 38px)", marginBottom: 10 }}>
                  {normalizedPlan.destination_summary}
                </div>
                <p style={{ color: "#666", fontSize: 15 }}>
                  A polished starting point with itinerary structure, activity ideas, and practical planning details.
                </p>
                <div className="source-row">
                  <span className="source-badge">Verified places: OpenTripMap</span>
                  <span className="source-badge">Weather: Open-Meteo</span>
                  <span className="source-badge">Routing: Mapbox</span>
                  <span className="source-badge">Planning layer: AI-assisted</span>
                </div>
              </div>
            </div>

            <div className="results-tabs">
              {RESULT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === "itinerary" && (
              <div>
                <div className="day-tabs">
                  {normalizedPlan.itinerary.map((day, index) => (
                    <button
                      key={`${day.day}-${index}`}
                      type="button"
                      className={`day-tab ${activeDay === index ? "active" : ""}`}
                      onClick={() => setActiveDay(index)}
                    >
                      Day {day.day}
                    </button>
                  ))}
                </div>

                {currentDay && (
                  <div className="section-card">
                    <div className="card-header">
                      <div className="card-icon terra">📅</div>
                      <div>
                        <div className="card-title">{currentDay.date}</div>
                        <div className="card-subtitle">{currentDay.theme}</div>
                      </div>
                    </div>
                    <div className="card-body">
                      <div className="timeline">
                        {["morning", "afternoon", "evening"].map((period) => {
                          const slot = currentDay[period];
                          return (
                            <div key={period} className="timeline-item">
                              <div className={`timeline-dot ${period}`} />
                              <div className="tl-card">
                                <div className={`tl-period ${period}`}>
                                  {period.toUpperCase()} · {slot.duration}
                                </div>
                                <div className="tl-title">{slot.title}</div>
                                <div className="tl-desc">{slot.description}</div>
                                {slot.tips && (
                                  <div style={{ fontSize: 12, color: "var(--terracotta)", background: "var(--terra-light)", borderRadius: 8, padding: "6px 10px", marginBottom: 10 }}>
                                    Tip: {slot.tips}
                                  </div>
                                )}
                                <div className="tl-tags">
                                  {slot.location && <span className="tl-tag">{slot.location}</span>}
                                  {slot.tags?.map((tag) => (
                                    <span key={tag} className="tl-tag">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "insights" && (
              <div>
                <div className="section-card">
                  <div className="card-header">
                    <div className="card-icon terra">🏛️</div>
                    <div>
                      <div className="card-title">Top Attractions</div>
                      <div className="card-subtitle">Highlights to build around</div>
                    </div>
                  </div>
                  <div className="card-body">
                    {normalizedPlan.attractions.length > 0 ? (
                      <div className="grid-2">
                        {normalizedPlan.attractions.map((attraction) => (
                          <div key={attraction.name} className="info-block">
                            <h4>{attraction.category}</h4>
                            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{attraction.name}</p>
                            <p>{attraction.description}</p>
                            <p style={{ marginTop: 8, fontSize: 12, color: "var(--terracotta)" }}>
                              Best time: {attraction.best_time}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">No attraction details came back yet, but the itinerary is ready.</div>
                    )}
                  </div>
                </div>

                <div className="section-card">
                  <div className="card-header">
                    <div className="card-icon gold">🍽️</div>
                    <div>
                      <div className="card-title">Restaurant Picks</div>
                      <div className="card-subtitle">Dining ideas matched to the trip</div>
                    </div>
                  </div>
                  <div className="card-body">
                    {normalizedPlan.restaurants.length > 0 ? (
                      <div className="grid-2">
                        {normalizedPlan.restaurants.map((restaurant) => (
                          <div key={restaurant.name} className="info-block">
                            <h4>
                              {restaurant.cuisine} · {restaurant.budget_level}
                            </h4>
                            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{restaurant.name}</p>
                            <p style={{ marginBottom: 4 }}>{restaurant.neighborhood}</p>
                            <p style={{ fontSize: 13, color: "var(--terracotta)" }}>
                              Try: {restaurant.signature_dish}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">Restaurant suggestions were not included in this response.</div>
                    )}
                  </div>
                </div>

                <div className="section-card">
                  <div className="card-header">
                    <div className="card-icon terra">🥘</div>
                    <div>
                      <div className="card-title">Must-Try Foods & Cuisines</div>
                      <div className="card-subtitle">Signature flavors to actively seek out on this trip</div>
                    </div>
                  </div>
                  <div className="card-body">
                    {normalizedPlan.must_try_foods.length > 0 ? (
                      <div className="grid-2">
                        {normalizedPlan.must_try_foods.map((food) => (
                          <div key={`${food.name}-${food.where_to_try}`} className="info-block">
                            <h4>{food.best_time}</h4>
                            <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>{food.name}</p>
                            <p>{food.description}</p>
                            <p style={{ marginTop: 8, fontSize: 13, color: "var(--terracotta)" }}>
                              Where to try: {food.where_to_try}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">Must-try food guidance was not included in this response.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "transport" && (
              <div>
                <div className="section-card">
                  <div className="card-header">
                    <div className="card-icon sky">✈️</div>
                    <div>
                      <div className="card-title">Getting to {form.to}</div>
                      <div className="card-subtitle">{normalizedPlan.best_transport || "Practical travel options for your route"}</div>
                    </div>
                  </div>
                  <div className="card-body">
                    {normalizedPlan.transport_options.length > 0 ? (
                      normalizedPlan.transport_options.map((option) => (
                        <div key={`${option.mode}-${option.route}`} className={`transport-card ${option.recommended ? "recommended" : ""}`}>
                          <div className="transport-icon">{option.icon}</div>
                          <div className="transport-info">
                            <div className="transport-name">{option.mode}</div>
                            <div className="transport-detail">
                              {option.route} · {option.duration} · {option.cost}
                            </div>
                            {option.note && <div style={{ fontSize: 12, color: "var(--mist)", marginTop: 4 }}>{option.note}</div>}
                          </div>
                          {option.recommended && <div className="transport-badge">Recommended</div>}
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">Transport ideas were not included, so check live routes and fares before booking.</div>
                    )}
                  </div>
                </div>

                <div className="section-card">
                  <div className="card-header">
                    <div className="card-icon sage">🛵</div>
                    <div>
                      <div className="card-title">Local Transport</div>
                      <div className="card-subtitle">Practical ways to move within the destination</div>
                    </div>
                  </div>
                  <div className="card-body">
                    {normalizedPlan.local_transport.length > 0 ? (
                      normalizedPlan.local_transport.map((item, index) => (
                        <div key={`${item.mode}-${index}`} className="list-item">
                          <div className="list-item-title">{item.mode}</div>
                          <div className="list-item-sub">{item.cost ? `${item.cost} · ` : ""}{item.recommendation || "Useful local option."}</div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">No local transport guidance was returned yet.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "weather" && (
              <div>
                <div className="section-card">
                  <div className="card-header">
                    <div className="card-icon sky">🌦️</div>
                    <div>
                      <div className="card-title">Weather Snapshot</div>
                      <div className="card-subtitle">Verified forecast summary from Open-Meteo</div>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="list-item">
                      <div className="list-item-title">{normalizedPlan.climate_note || "Weather summary unavailable"}</div>
                      <div className="list-item-sub">Use this to plan pacing, clothing, and backups.</div>
                    </div>
                    <div className="list-stack" style={{ marginTop: 16 }}>
                      {normalizedPlan.safety_alerts.length > 0 ? normalizedPlan.safety_alerts.map((alert, index) => (
                        <div key={`${alert.title}-${index}`} className="list-item">
                          <div className="list-item-title">{alert.title}</div>
                          <div className="list-item-sub">{alert.detail}</div>
                        </div>
                      )) : <div className="empty-state">No forecast alerts were returned for these dates.</div>}
                    </div>
                  </div>
                </div>

                <div className="section-card">
                  <div className="card-header">
                    <div className="card-icon gold">🎒</div>
                    <div>
                      <div className="card-title">Packing Suggestions</div>
                      <div className="card-subtitle">Derived from forecast conditions</div>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="kv-grid">
                      {Object.entries(normalizedPlan.packing_list).map(([section, items]) => (
                        <div key={section} className="info-block">
                          <h4>{section}</h4>
                          {(items || []).length > 0 ? (
                            <div className="pill-list">
                              {items.map((item) => (
                                <span key={`${section}-${item}`} className="pill">{item}</span>
                              ))}
                            </div>
                          ) : (
                            <p>No items suggested.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "stay" && (
              <div>
                <div className="section-card">
                  <div className="card-header">
                    <div className="card-icon gold">🏨</div>
                    <div>
                      <div className="card-title">Where to Stay</div>
                      <div className="card-subtitle">AI-assisted suggestions anchored to the verified trip area</div>
                    </div>
                  </div>
                  <div className="card-body">
                    {normalizedPlan.stay_recommendations.length > 0 ? (
                      normalizedPlan.stay_recommendations.map((item, index) => (
                        <div key={`${item.area}-${index}`} className="list-item">
                          <div className="list-item-title">{item.area}</div>
                          <div className="list-item-sub">{item.description}</div>
                          <div className="pill-list" style={{ marginTop: 10 }}>
                            {(item.good_for || []).map((tag) => (
                              <span key={`${item.area}-${tag}`} className="pill">{tag}</span>
                            ))}
                            {item.price_range && <span className="pill">{item.price_range}</span>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">No stay recommendations were returned.</div>
                    )}
                  </div>
                </div>

                <div className="section-card">
                  <div className="card-header">
                    <div className="card-icon terra">🎟️</div>
                    <div>
                      <div className="card-title">Booking Information</div>
                      <div className="card-subtitle">Check official listings before payment</div>
                    </div>
                  </div>
                  <div className="card-body">
                    {normalizedPlan.booking_info.length > 0 ? (
                      normalizedPlan.booking_info.map((item, index) => (
                        <div key={`${item.place}-${index}`} className="list-item">
                          <div className="list-item-title">{item.place}</div>
                          <div className="list-item-sub">
                            {item.entry_fee || "Fee not provided"} · {item.timings || "Timing not provided"} · {item.advance_booking || "Booking status unknown"}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state">Booking details were not returned.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "route" && (
              <div>
                <div className="section-card">
                  <div className="card-header">
                    <div className="card-icon sage">🗺️</div>
                    <div>
                      <div className="card-title">Route Optimization</div>
                      <div className="card-subtitle">
                        {normalizedPlan.route_optimization?.route_note || "Verified sequencing from Mapbox travel-time data"}
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    {normalizedPlan.route_optimization?.ordered_places?.length > 0 ? (
                      <>
                        <div className="pill-list" style={{ marginBottom: 18 }}>
                          {normalizedPlan.route_optimization?.recommended_profile && (
                            <span className="pill">
                              Recommended mode: {titleCase(normalizedPlan.route_optimization.recommended_profile)}
                            </span>
                          )}
                          {normalizedPlan.route_optimization?.total_duration_label && (
                            <span className="pill">Total transfer time: {normalizedPlan.route_optimization.total_duration_label}</span>
                          )}
                          {normalizedPlan.route_optimization?.total_distance_label && (
                            <span className="pill">Total route distance: {normalizedPlan.route_optimization.total_distance_label}</span>
                          )}
                        </div>
                        <div className="route-list">
                          {normalizedPlan.route_optimization.ordered_places.map((item, index) => {
                            const nextLeg = normalizedPlan.route_optimization?.ordered_legs?.[index];
                            return (
                              <div key={`${item.name}-${index}`} className="route-stop">
                                <div className="route-num">{index + 1}</div>
                                <div>
                                  <div className="list-item-title">{item.name}</div>
                                  <div className="list-item-sub">{item.source || "Verified stop"}</div>
                                  {nextLeg && (
                                    <div className="pill-list" style={{ marginTop: 8 }}>
                                      <span className="pill">{nextLeg.profile_label || "Transfer"}</span>
                                      <span className="pill">Next leg: {nextLeg.duration_label}</span>
                                      <span className="pill">{nextLeg.distance_label}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        {normalizedPlan.route_optimization?.ordered_legs?.length > 0 && (
                          <div className="list-stack" style={{ marginTop: 20 }}>
                            {normalizedPlan.route_optimization.ordered_legs.map((leg, index) => (
                              <div key={`${leg.from}-${leg.to}-${index}`} className="list-item">
                                <div className="list-item-title">{leg.from} to {leg.to}</div>
                                <div className="list-item-sub">
                                  {(leg.profile_label || "Transfer")} · {leg.duration_label} · {leg.distance_label}
                                </div>
                                {Array.isArray(leg.step_summary) && leg.step_summary.length > 0 && (
                                  <div className="pill-list" style={{ marginTop: 10 }}>
                                    {leg.step_summary.map((step, stepIndex) => (
                                      <span key={`${leg.from}-${leg.to}-step-${stepIndex}`} className="pill">
                                        {step}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="empty-state">Route optimization data is not available for this plan.</div>
                    )}
                  </div>
                </div>

                <div className="section-card">
                  <div className="card-header">
                    <div className="card-icon sky">💡</div>
                    <div>
                      <div className="card-title">Planner Notes</div>
                      <div className="card-subtitle">AI-assisted guidance using verified context</div>
                    </div>
                  </div>
                  <div className="card-body">
                    {normalizedPlan.local_tips.length > 0 ? (
                      <div className="list-stack">
                        {normalizedPlan.local_tips.map((tip, index) => (
                          <div key={`tip-${index}`} className="list-item">
                            <div className="list-item-title">Tip {index + 1}</div>
                            <div className="list-item-sub">{tip}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">No local planning tips were returned.</div>
                    )}
                    {normalizedPlan.alternative_dates.length > 0 && (
                      <div className="list-stack" style={{ marginTop: 16 }}>
                        {normalizedPlan.alternative_dates.map((item, index) => (
                          <div key={`${item.range}-${index}`} className="list-item">
                            <div className="list-item-title">{item.range}</div>
                            <div className="list-item-sub">{item.score}</div>
                            <div className="pill-list" style={{ marginTop: 10 }}>
                              {(item.reasons || []).map((reason) => (
                                <span key={`${item.range}-${reason}`} className="pill">{reason}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === "budget" && (
              <div>
                <div className="section-card">
                  <div className="card-header">
                    <div className="card-icon gold">💸</div>
                    <div>
                      <div className="card-title">Budget Breakdown</div>
                      <div className="card-subtitle">
                        Estimated total: {normalizedPlan.budget.currency} {normalizedPlan.budget.total?.toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    {[
                      { label: "Travel", key: "travel", color: "var(--sky)" },
                      { label: "Stay", key: "accommodation", color: "var(--terracotta)" },
                      { label: "Food", key: "food", color: "var(--gold)" },
                      { label: "Activities", key: "activities", color: "var(--sage)" },
                    ].map((item) => {
                      const budgetLine = normalizedPlan.budget[item.key];
                      if (!budgetLine) return null;
                      return (
                        <div key={item.key} className="budget-row">
                          <div className="budget-label">{item.label}</div>
                          <div className="budget-bar-wrap">
                            <div
                              className="budget-bar"
                              style={{
                                width: `${Math.min(100, (budgetLine.amount / normalizedPlan.budget.total) * 100)}%`,
                                background: item.color,
                              }}
                            />
                          </div>
                          <div className="budget-amount">
                            {normalizedPlan.budget.currency} {budgetLine.amount?.toLocaleString()}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="section-card">
                  <div className="card-header">
                    <div className="card-icon sage">💡</div>
                    <div>
                      <div className="card-title">Budget Notes</div>
                      <div className="card-subtitle">Helpful context and savings hints</div>
                    </div>
                  </div>
                  <div className="card-body">
                    <div className="list-stack">
                      {[normalizedPlan.budget.travel, normalizedPlan.budget.accommodation, normalizedPlan.budget.food, normalizedPlan.budget.activities]
                        .filter(Boolean)
                        .map((item, index) => (
                          <div key={index} className="list-item">
                            <div className="list-item-title">{item.note || "Budget guidance"}</div>
                            <div className="list-item-sub">Use this as a planning range rather than a final price quote.</div>
                          </div>
                        ))}
                      {(normalizedPlan.budget.saving_tips || []).map((tip, index) => (
                        <div key={`tip-${index}`} className="list-item">
                          <div className="list-item-title">Savings tip</div>
                          <div className="list-item-sub">{tip}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
