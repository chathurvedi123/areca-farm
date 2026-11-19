// ============================================================
// services/scraper.js
// PURPOSE: Fetch the latest arecanut prices for Karnataka.
//
// MAIN SOURCE: data.gov.in "Current Daily Price of Various
//   Commodities from Various Markets (Mandi)" = official Agmarknet
//   feed. Free, gives district + market + variety + min/max/modal.
//   Needs a FREE API key:  data.gov.in -> Register/Login ->
//   My Account -> "Get API Key"  ->  put in backend/.env:
//        DATA_GOV_API_KEY=your_key_here
//
// NOTE: the feed holds the CURRENT day's prices only (it fills during
// the day; best after ~2 pm IST), so it adds new rows day by day.
//
// commodityonline.com now answers HTTP 403 (blocks programs). It is
// OFF by default; set USE_COMMODITYONLINE=true to try it anyway.
// ============================================================
const { parseHtml, parseDate, parsePrice, districtFor, normVariety } = require("./dataset");

const RESOURCE = "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const todayIso = () => new Date().toISOString().slice(0, 10);

async function fetchDataGov() {
  const key = process.env.DATA_GOV_API_KEY;
  if (!key) throw new Error("DATA_GOV_API_KEY is not set in backend/.env (free key: data.gov.in -> My Account -> API key)");
  const rows = [];
  const limit = 500;
  for (let page = 0; page < 20; page++) {
    const url = new URL(RESOURCE);
    url.searchParams.set("api-key", key);
    url.searchParams.set("format", "json");
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("offset", String(page * limit));
    url.searchParams.set("filters[state.keyword]", "Karnataka");
    url.searchParams.set("filters[commodity]", "Arecanut(Betelnut/Supari)");
    const res = await fetch(url, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(30000) });
    if (!res.ok) throw new Error(`data.gov.in HTTP ${res.status}` + (res.status === 403 || res.status === 401 ? " (check DATA_GOV_API_KEY)" : ""));
    const json = await res.json();
    const recs = Array.isArray(json.records) ? json.records : [];
    for (const r of recs) {
      const date = parseDate(r.arrival_date);
      const avg = parsePrice(r.modal_price);
      if (!date || !avg || avg < 1000 || /husk/i.test(r.variety || "")) continue;
      let min = parsePrice(r.min_price) ?? avg;
      let max = parsePrice(r.max_price) ?? avg;
      if (min > max) [min, max] = [max, min];
      rows.push([date, districtFor(r.district, r.market), String(r.market || "-").trim(), normVariety(r.variety), min, max, avg, String(r.district || "").trim(), true]);
    }
    if (recs.length < limit) break;
  }
  return rows;
}

// ---- optional: commodityonline (usually blocked) ----
const BASE = "https://www.commodityonline.com/mandiprices";
const URLS = [`${BASE}/arecanut-betelnutsupari/karnataka`];
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
};
async function fetchCommodityOnline(errors) {
  const rows = [];
  for (const url of URLS) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      rows.push(...parseHtml(await res.text()));
    } catch (e) {
      errors.push(`commodityonline ${url.replace(BASE, "")}: ${e.message}`);
    }
    await sleep(1000);
  }
  return rows;
}

async function fetchLatest() {
  const rows = [];
  const errors = [];
  const today = todayIso();
  if (process.env.DATA_GOV_API_KEY) {
    try { rows.push(...(await fetchDataGov())); }
    catch (e) { errors.push(e.message); }
  } else {
    errors.push("Online update is off: add DATA_GOV_API_KEY to backend/.env (free key from data.gov.in).");
  }
  if (process.env.USE_COMMODITYONLINE === "true") rows.push(...(await fetchCommodityOnline(errors)));
  return { rows: rows.filter((r) => r[0] <= today), errors };
}

module.exports = { fetchLatest, fetchDataGov };