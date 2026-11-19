// ============================================================
// services/priceService.js
// PURPOSE: Glue. Loads the dataset once, trains the models once,
//          keeps them in memory, and can refresh from the web.
// ============================================================
const dataset = require("./dataset");
const predictor = require("./predictor");
const scraper = require("./scraper");

let store = null;
let refreshing = false;
let state = { ready: false, loading: false, error: null };

async function init() {
  state = { ready: false, loading: true, error: null };
  const t0 = Date.now();
  try {
    const { rows, file, fromCache, prebuilt } = await dataset.loadRows();
    const tLoad = Date.now() - t0;
    store = predictor.buildStore(rows);
    const dates = rows.map((r) => r[0]).sort();
    state = {
      ready: true, loading: false, error: null,
      file, fromCache, prebuilt: !!prebuilt, rows: rows.length,
      firstDate: dates[0], lastDate: dates[dates.length - 1],
      districtsWithData: store.districts.size,
      seriesTrained: store.series.size,
      loadMs: tLoad, totalMs: Date.now() - t0,
    };
    console.log(
      `📊 Dataset ready: ${rows.length} rows (${state.firstDate} → ${state.lastDate}), ` +
      `${store.districts.size} districts, ${store.series.size} models trained in ${state.totalMs} ms` +
      (fromCache ? " (cache)" : "")
    );
  } catch (e) {
    state = { ready: false, loading: false, error: e.message };
    console.error("❌ Dataset error:", e.message);
  }
  return state;
}

async function refresh() {
  if (state.prebuilt) return { fetched: 0, added: 0, errors: ["This server uses a read-only prebuilt dataset. Update on your PC, run npm run build-data, then push."] };
  if (refreshing) return { busy: true };
  refreshing = true;
  try {
    const { rows, errors } = await scraper.fetchLatest();
    let added = 0;
    if (rows.length) added = await dataset.appendRows(rows);
    if (added > 0) await init(); // retrain with the new rows
    return { fetched: rows.length, added, errors, lastDate: state.lastDate };
  } finally {
    refreshing = false;
  }
}

function startAutoUpdate() {
  if (process.env.AUTO_UPDATE === "false") return;
  if (!process.env.DATA_GOV_API_KEY && process.env.USE_COMMODITYONLINE !== "true") {
    console.log("ℹ️  Auto update is off (add DATA_GOV_API_KEY to backend/.env to enable it)");
    return;
  }
  const run = () => refresh().then((r) => console.log("🔄 Auto update:", JSON.stringify(r))).catch((e) => console.log("🔄 Auto update failed:", e.message));
  setTimeout(run, 20000);
  setInterval(run, 6 * 60 * 60 * 1000);
}

module.exports = {
  init, refresh, startAutoUpdate,
  isReady: () => state.ready,
  status: () => ({ ...state, refreshing }),
  districts: () => predictor.listDistricts(store),
  predict: (district, variety, days) => predictor.predictFor(store, district, variety, days),
};