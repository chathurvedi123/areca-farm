// ============================================================
// services/scraper.js
// PURPOSE: Fetch the latest arecanut prices for Karnataka from
//          commodityonline.com and return them as rows.
//
// NOTE: websites can block automated requests. If that happens
// you will see the HTTP status in the result - nothing is
// damaged, your dataset just is not updated that time.
// ============================================================
const { parseHtml } = require("./dataset");

const BASE = "https://www.commodityonline.com/mandiprices";
const STATE_URL = `${BASE}/arecanut-betelnutsupari/karnataka`;
// district pages (extra coverage; a wrong slug just returns 404 and is skipped)
const DISTRICT_SLUGS = [
  "shimoga", "davangere", "chitradurga", "tumkur", "chikmagalur", "hassan", "mysore",
  "udupi", "mangalore-dakshin-kannad", "karwar-uttar-kannad", "kodagu", "haveri",
  "dharwad", "bangalore", "mandya", "belgaum", "bellary",
];
const URLS = [STATE_URL, ...DISTRICT_SLUGS.map((s) => `${BASE}/district/karnataka/${s}/arecanut-betelnutsupari`)];

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "en-IN,en;q=0.9",
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchLatest() {
  const rows = [];
  const errors = [];
  const today = new Date().toISOString().slice(0, 10);
  for (const url of URLS) {
    try {
      const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(20000) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const found = parseHtml(await res.text()).filter((r) => r[0] <= today); // ignore future dates
      rows.push(...found);
    } catch (e) {
      errors.push(`${url.replace(BASE, "")}: ${e.message}`);
    }
    await sleep(1200); // be polite to the website
  }
  return { rows, errors };
}

module.exports = { fetchLatest };