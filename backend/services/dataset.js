// ============================================================
// services/dataset.js
// PURPOSE: Read the price dataset ONCE (Excel .xlsx, or an HTML
//          export), turn it into rows, and append new rows from the
//          web back into the same file.
//
// DEFAULT FILE : D:\dataset for areca\dataset.xlsx
// OTHER PLACE  : set DATASET_PATH in backend/.env (file or folder)
//
// COLUMNS ARE FOUND BY HEADER NAME (Arrival Date, District, Market,
// Variety, Min Price, Max Price, Modal/Avg Price) - not by position.
// If there is no District column, the district is worked out from
// the market name (Thirthahalli -> Shivamogga, ...).
//
// SPEED: parsed rows are cached in data/cache.json. If the file has
// not changed, the next start skips reading Excel completely.
// ============================================================
const fs = require("fs");
const path = require("path");

const LOCAL_PATHS = ["D:\\dataset for areca\\dataset.xlsx", "D:\\dataset\\dataset.htm"];
const FALLBACK_PATHS = [
  path.join(__dirname, "..", "data", "dataset.xlsx"),
  path.join(__dirname, "..", "data", "dataset.htm"),
];
const CACHE_PATH = path.join(__dirname, "..", "data", "cache.json");
const PREBUILT_PATH = path.join(__dirname, "..", "data", "prices.json"); // compact copy made by: npm run build-data

function getExcel() {
  try { return require("exceljs"); }
  catch (_) { throw new Error("The 'exceljs' package is missing. Run:  npm install exceljs  (inside the backend folder)"); }
}

// ---------- All 31 Karnataka districts (+ spellings mandi sites use) ----------
const KARNATAKA_DISTRICTS = [
  { name: "Bagalkot", kn: "ಬಾಗಲಕೋಟೆ", alias: ["bagalkot"] },
  { name: "Ballari", kn: "ಬಳ್ಳಾರಿ", alias: ["bellary", "ballari"] },
  { name: "Belagavi", kn: "ಬೆಳಗಾವಿ", alias: ["belgaum", "belagavi"] },
  { name: "Bengaluru Rural", kn: "ಬೆಂಗಳೂರು ಗ್ರಾಮಾಂತರ", alias: ["bangalore rural", "bengaluru rural"] },
  { name: "Bengaluru Urban", kn: "ಬೆಂಗಳೂರು ನಗರ", alias: ["bangalore", "bengaluru"] },
  { name: "Bidar", kn: "ಬೀದರ್", alias: ["bidar"] },
  { name: "Chamarajanagar", kn: "ಚಾಮರಾಜನಗರ", alias: ["chamarajanagar", "chamrajnagar", "chamarajanagara"] },
  { name: "Chikkaballapura", kn: "ಚಿಕ್ಕಬಳ್ಳಾಪುರ", alias: ["chikkaballapura", "chikballapur", "chickballapur"] },
  { name: "Chikkamagaluru", kn: "ಚಿಕ್ಕಮಗಳೂರು", alias: ["chikkamagaluru", "chikmagalur", "chickmagalur"] },
  { name: "Chitradurga", kn: "ಚಿತ್ರದುರ್ಗ", alias: ["chitradurga"] },
  { name: "Dakshina Kannada", kn: "ದಕ್ಷಿಣ ಕನ್ನಡ", alias: ["dakshina kannada", "dakshin kannad", "mangalore", "mangaluru"] },
  { name: "Davanagere", kn: "ದಾವಣಗೆರೆ", alias: ["davangere", "davanagere"] },
  { name: "Dharwad", kn: "ಧಾರವಾಡ", alias: ["dharwad", "dharwar"] },
  { name: "Gadag", kn: "ಗದಗ", alias: ["gadag"] },
  { name: "Hassan", kn: "ಹಾಸನ", alias: ["hassan"] },
  { name: "Haveri", kn: "ಹಾವೇರಿ", alias: ["haveri"] },
  { name: "Kalaburagi", kn: "ಕಲಬುರಗಿ", alias: ["gulbarga", "kalaburagi"] },
  { name: "Kodagu", kn: "ಕೊಡಗು", alias: ["kodagu", "coorg"] },
  { name: "Kolar", kn: "ಕೋಲಾರ", alias: ["kolar"] },
  { name: "Koppal", kn: "ಕೊಪ್ಪಳ", alias: ["koppal"] },
  { name: "Mandya", kn: "ಮಂಡ್ಯ", alias: ["mandya"] },
  { name: "Mysuru", kn: "ಮೈಸೂರು", alias: ["mysore", "mysuru"] },
  { name: "Raichur", kn: "ರಾಯಚೂರು", alias: ["raichur"] },
  { name: "Ramanagara", kn: "ರಾಮನಗರ", alias: ["ramanagara", "ramanagaram", "bengaluru south"] },
  { name: "Shivamogga", kn: "ಶಿವಮೊಗ್ಗ", alias: ["shimoga", "shivamogga"] },
  { name: "Tumakuru", kn: "ತುಮಕೂರು", alias: ["tumkur", "tumakuru"] },
  { name: "Udupi", kn: "ಉಡುಪಿ", alias: ["udupi"] },
  { name: "Uttara Kannada", kn: "ಉತ್ತರ ಕನ್ನಡ", alias: ["uttara kannada", "uttar kannad", "karwar"] },
  { name: "Vijayanagara", kn: "ವಿಜಯನಗರ", alias: ["vijayanagara"] },
  { name: "Vijayapura", kn: "ವಿಜಯಪುರ", alias: ["bijapur", "vijayapura"] },
  { name: "Yadgir", kn: "ಯಾದಗಿರಿ", alias: ["yadgir", "yadagiri"] },
];
const KNOWN = new Set(KARNATAKA_DISTRICTS.map((d) => d.name));

// market (APMC) name -> district. Used ONLY when the file has no usable District value.
const MARKET_DISTRICT = {
  Shivamogga: ["shivamogga", "shimoga", "thirthahalli", "tirthahalli", "sagar", "sagara", "bhadravathi", "shikaripura", "shikaripur", "soraba", "sorab", "hosanagara", "hosnagar"],
  Davanagere: ["davangere", "davanagere", "channagiri", "honnali", "jagalur", "harihara"],
  Chitradurga: ["chitradurga", "holalkere", "hiriyur", "hosadurga", "challakere", "molakalmuru"],
  Tumakuru: ["tumkur", "tumakuru", "tiptur", "kunigal", "sira", "gubbi", "madhugiri", "turuvekere", "pavagada"],
  "Dakshina Kannada": ["puttur", "mangalore", "mangaluru", "bantwal", "sullia", "belthangady", "uppinangadi", "moodabidri"],
  Udupi: ["udupi", "kundapura", "karkala", "kundapur"],
  "Uttara Kannada": ["sirsi", "siddapur", "yellapur", "kumta", "honnavar", "bhatkal", "karwar", "ankola", "mundgod", "haliyal"],
  Chikkamagaluru: ["chikkamagaluru", "chikmagalur", "mudigere", "koppa", "narasimharajapura", "tarikere", "kadur", "sringeri"],
  Hassan: ["hassan", "arsikere", "belur", "channarayapatna", "holenarasipur", "sakleshpur", "alur"],
  Mysuru: ["mysore", "mysuru", "periyapatna", "piriyapatna", "hunsur", "k.r.nagar", "krishnarajanagar"],
  Kodagu: ["madikeri", "somwarpet", "virajpet", "kushalnagar", "kodagu"],
  Haveri: ["haveri", "ranibennur", "hirekerur", "savanur", "byadgi"],
  Mandya: ["mandya"],
  Chamarajanagar: ["chamarajanagar", "kollegal", "gundlupet"],
  "Bengaluru Urban": ["bangalore", "bengaluru", "yeshwanthpur"],
};
const MARKET_LIST = [];
for (const [d, list] of Object.entries(MARKET_DISTRICT)) for (const m of list) MARKET_LIST.push([m, d]);

function titleCase(s) {
  return String(s).toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase()).trim();
}

// "Mangalore(Dakshin Kannad)" -> "Dakshina Kannada"
function canonDistrict(raw) {
  const t = String(raw || "").toLowerCase().replace(/[()]/g, " ").replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
  for (const d of KARNATAKA_DISTRICTS) for (const a of d.alias) if (t.includes(a)) return d.name;
  return t ? titleCase(t) : "Unknown";
}
function districtFor(rawDistrict, market) {
  const c = canonDistrict(rawDistrict);
  if (KNOWN.has(c)) return c;
  const m = String(market || "").toLowerCase();
  for (const [key, d] of MARKET_LIST) if (m.includes(key)) return d;
  return c === "Unknown" ? canonDistrict(market) : c;
}
// "Rashi(Idi)" -> "Rashi", "RED " -> "Red"
const normVariety = (v) => titleCase(String(v || "").replace(/[\(\[].*?[\)\]]/g, " ").replace(/\s+/g, " ").trim()) || "Unknown";

// ---------- value helpers (work for text, numbers and Excel Date cells) ----------
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, "0");
function iso(y, m, d) {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}
function parseDate(v) {
  if (v instanceof Date) return isNaN(v) ? null : iso(v.getUTCFullYear(), v.getUTCMonth() + 1, v.getUTCDate());
  if (typeof v === "number") { // Excel serial date
    if (v < 36500 || v > 73500) return null;
    const d = new Date(Math.round((v - 25569) * 86400000));
    return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
  }
  const t = String(v || "").trim();
  let m = t.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/); // 17/10/2026 (day first)
  if (m) return iso(+m[3], +m[2], +m[1]);
  m = t.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/); // 2026-10-17
  if (m) return iso(+m[1], +m[2], +m[3]);
  m = t.match(/^(\d{1,2})[\s\-\/.]+([A-Za-z]{3})[a-z]*\.?[\s,\-\/.]+(\d{2,4})/); // 17 Oct 2026, 17-Oct-26
  if (m && MONTHS[m[2].toLowerCase()]) {
    let y = +m[3];
    if (y < 100) y += 2000;
    return iso(y, MONTHS[m[2].toLowerCase()], +m[1]);
  }
  return null;
}
function parsePrice(v) {
  if (v == null || v instanceof Date) return null;
  if (typeof v === "number") return v > 0 ? v : null;
  const t = String(v).replace(/,/g, "");
  const m = t.match(/(\d+(?:\.\d+)?)/);
  if (!m) return null;
  let x = parseFloat(m[1]);
  if (/\/\s*kg/i.test(t) && !/quintal/i.test(t)) x *= 100; // Rs/kg -> Rs/quintal
  return x > 0 ? x : null;
}

// ---------- header detection ----------
function mapHeaders(cells) {
  const m = {};
  cells.forEach((c, i) => {
    const t = String(c || "").toLowerCase();
    if (m.date === undefined && /date/.test(t)) m.date = i;
    else if (m.district === undefined && /district/.test(t)) m.district = i;
    else if (m.market === undefined && /market|mandi|apmc/.test(t)) m.market = i;
    else if (m.variety === undefined && /variety|grade/.test(t)) m.variety = i;
    else if (m.min === undefined && /\bmin/.test(t)) m.min = i;
    else if (m.max === undefined && /\bmax/.test(t)) m.max = i;
    else if (m.avg === undefined && /avg|average|modal/.test(t)) m.avg = i;
    else if (m.state === undefined && /state/.test(t)) m.state = i;
    else if (m.commodity === undefined && /commodity/.test(t)) m.commodity = i;
  });
  const a = m.avg !== undefined ? String(cells[m.avg]).toLowerCase() : "";
  m.mult = /\bkg\b|\/\s*kg|per kg/.test(a) && !/quintal|qtl/.test(a) ? 100 : 1; // price per kg -> per quintal
  return m;
}
const validMap = (m) => m.date !== undefined && m.avg !== undefined && (m.district !== undefined || m.market !== undefined);

const textOf = (v) => (v == null || v instanceof Date ? "" : String(v).trim());

// one table/sheet row -> [date, district, market, variety, min, max, avg, rawDistrict]
function buildRow(map, get) {
  const price = (v) => {
    const x = parsePrice(v);
    if (x == null) return null;
    return typeof v === "number" || !/kg/i.test(String(v)) ? x * (map.mult || 1) : x;
  };
  const date = parseDate(get(map.date));
  const avg = price(get(map.avg));
  if (!date || !avg || avg < 1000 || avg > 300000) return null;
  let min = price(get(map.min)) ?? avg;
  let max = price(get(map.max)) ?? avg;
  if (min > max) [min, max] = [max, min];
  const rawDistrict = textOf(get(map.district));
  const market = textOf(get(map.market)) || "-";
  return [date, districtFor(rawDistrict, market), market, normVariety(textOf(get(map.variety))), min, max, avg, rawDistrict || market];
}

// =====================================================================
//  HTML source (older export format) - kept so both formats work
// =====================================================================
const decode = (s) =>
  s.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
const clean = (s) => decode(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
function cellsOf(trHtml) {
  const out = [];
  const re = /<t([dh])[^>]*>([\s\S]*?)<\/t\1>/gi;
  let m;
  while ((m = re.exec(trHtml))) out.push(clean(m[2]));
  return out;
}
function parseHtml(html) {
  const rows = [];
  const tre = /<table[\s\S]*?<\/table>/gi;
  let tm;
  while ((tm = tre.exec(html))) {
    const rowRe = /<tr[\s\S]*?<\/tr>/gi;
    let rm, map = null;
    while ((rm = rowRe.exec(tm[0]))) {
      const cells = cellsOf(rm[0]);
      if (!cells.length) continue;
      if (!map) {
        const mm = mapHeaders(cells);
        if (validMap(mm)) map = mm;
        continue;
      }
      const r = buildRow(map, (i) => (i === undefined ? "" : cells[i] || ""));
      if (r) rows.push(r);
    }
  }
  return rows;
}
function readText(file) {
  const buf = fs.readFileSync(file);
  const head = buf.slice(0, 2000).toString("latin1");
  const enc = /charset\s*=\s*["']?(utf-8|utf8)/i.test(head) || !/charset/i.test(head) ? "utf8" : "latin1";
  return { text: buf.toString(enc), enc };
}

// =====================================================================
//  Excel (.xlsx) source
// =====================================================================
function cellValue(v) {
  if (v == null) return "";
  if (v instanceof Date) return v;
  if (typeof v === "object") {
    if (v.richText) return v.richText.map((t) => t.text).join("");
    if ("result" in v) return cellValue(v.result);
    if (v.text !== undefined) return String(v.text);
    return "";
  }
  return v;
}
function detectHeader(ws) {
  const maxR = Math.min(40, ws.rowCount);
  for (let r = 1; r <= maxR; r++) {
    const vals = ws.getRow(r).values || [];
    const cells = [];
    for (let c = 1; c <= Math.max(ws.columnCount, vals.length - 1); c++) cells.push(textOf(cellValue(vals[c])));
    const map = mapHeaders(cells);
    if (validMap(map)) return { row: r, map, cells };
  }
  return null;
}
async function readWorkbook(file) {
  const Excel = getExcel();
  const wb = new Excel.Workbook();
  await wb.xlsx.readFile(file);
  return wb;
}
async function parseXlsx(file) {
  const wb = await readWorkbook(file);
  const rows = [];
  const sheets = [];
  wb.eachSheet((ws) => {
    const det = detectHeader(ws);
    if (!det) { sheets.push({ name: ws.name, count: 0, note: "no header row recognised" }); return; }
    let count = 0;
    for (let r = det.row + 1; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      if (!row.hasValues) continue;
      const built = buildRow(det.map, (i) => (i === undefined ? "" : cellValue(row.getCell(i + 1).value)));
      if (built) { rows.push(built); count++; }
    }
    sheets.push({ name: ws.name, headerRow: det.row, map: det.map, headers: det.cells, count });
  });
  return { rows, sheets };
}

// =====================================================================
//  finding the files
// =====================================================================
const SKIP = /^(tabstrip|filelist|header|stylesheet)/i;
const isBackup = (n) => /\.backup\.(xlsx|html?)$/i.test(n) || n.startsWith("~$");
function collectHtm(dir, out, depth = 0) {
  let names = [];
  try { names = fs.readdirSync(dir); } catch (_) { return; }
  for (const n of names) {
    const p = path.join(dir, n);
    let st;
    try { st = fs.statSync(p); } catch (_) { continue; }
    if (st.isFile()) {
      if (/\.html?$/i.test(n) && !isBackup(n) && !SKIP.test(n) && !out.includes(p)) out.push(p);
    } else if (st.isDirectory() && depth < 1) collectHtm(p, out, depth + 1);
  }
}
function listSourceFiles() {
  const candidates = [process.env.DATASET_PATH, ...LOCAL_PATHS, ...FALLBACK_PATHS].filter(Boolean);
  for (const c of candidates) {
    if (!fs.existsSync(c)) continue;
    const out = [];
    const st = fs.statSync(c);
    if (st.isDirectory()) {
      for (const n of fs.readdirSync(c)) if (/\.xlsx$/i.test(n) && !isBackup(n)) out.push(path.join(c, n));
      if (!out.length) collectHtm(c, out);
    } else if (/\.xlsx$/i.test(c)) out.push(c);
    else { out.push(c); collectHtm(path.dirname(c), out); }
    if (out.length) return out;
  }
  return [];
}
const resolveDatasetPath = () => listSourceFiles()[0] || null;

// =====================================================================
//  LOAD (with cache)
// =====================================================================
async function loadRows() {
  const files = listSourceFiles();
  if (!files.length && fs.existsSync(PREBUILT_PATH)) {
    const j = JSON.parse(fs.readFileSync(PREBUILT_PATH, "utf8"));
    return { rows: j.rows, file: "prices.json (prebuilt, read-only)", files: [PREBUILT_PATH], perFile: { [PREBUILT_PATH]: j.rows.length }, fromCache: true, prebuilt: true };
  }
  if (!files.length) {
    throw new Error("Dataset not found. Looked for: " + [process.env.DATASET_PATH, ...LOCAL_PATHS, ...FALLBACK_PATHS].filter(Boolean).join("  |  "));
  }
  const sig = files.map((f) => { const s = fs.statSync(f); return `${f}|${s.size}|${Math.round(s.mtimeMs)}`; }).join(";");
  try {
    const cache = JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
    if (cache.sig === sig) return { rows: cache.rows, file: files.join(", "), files, perFile: cache.perFile, fromCache: true };
  } catch (_) { /* no cache yet */ }

  const rows = [];
  const perFile = {};
  for (const f of files) {
    const got = /\.xlsx$/i.test(f) ? (await parseXlsx(f)).rows : parseHtml(readText(f).text);
    perFile[f] = got.length;
    for (const r of got) rows.push(r);
  }
  if (!rows.length) {
    throw new Error("No price rows could be read from: " + files.join(", ") + ".  Run:  node scripts/inspect-dataset.js");
  }
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify({ sig, rows, perFile }));
  } catch (_) { /* cache is optional */ }
  return { rows, file: files.join(", "), files, perFile, fromCache: false };
}

// =====================================================================
//  APPEND new rows (from the web) into the dataset file
// =====================================================================
const keyOf = (r) => `${r[0]}|${r[1]}|${String(r[2]).toLowerCase()}|${String(r[3]).toLowerCase()}`;
const lockMsg = (file) => `Cannot write to ${file}. If it is open in Excel, close it and try again.`;

async function appendXlsx(file, fresh) {
  const wb = await readWorkbook(file);
  // the sheet with the most rows is the data sheet
  let best = null;
  wb.eachSheet((ws) => {
    const det = detectHeader(ws);
    if (det && (!best || ws.rowCount > best.ws.rowCount)) best = { ws, det };
  });
  if (!best) throw new Error("Could not find the price table inside " + file);
  const { ws, det } = best;
  const { map, cells } = det;

  let last = det.row;
  for (let r = ws.rowCount; r > det.row; r--) {
    const v = cellValue(ws.getRow(r).getCell(map.date + 1).value);
    if (v !== "" && v != null) { last = r; break; }
  }
  const styleRow = ws.getRow(last);
  const dv = cellValue(styleRow.getCell(map.date + 1).value);
  const dateKind = dv instanceof Date ? "date" : typeof dv === "number" ? "serial" : "text";
  const dmySlash = typeof dv === "string" && /^\d{1,2}\/\d{1,2}\/\d{4}/.test(dv);
  const dmyDash = typeof dv === "string" && /^\d{1,2}-\d{1,2}-\d{4}/.test(dv);
  const av = cellValue(styleRow.getCell(map.avg + 1).value);
  const priceAsNumber = typeof av === "number";
  const withRs = typeof av === "string" && /rs/i.test(av);
  const mult = map.mult || 1;

  const dateVal = (iso_) => {
    const [y, m, d] = iso_.split("-").map(Number);
    if (dateKind === "date") return new Date(Date.UTC(y, m - 1, d));
    if (dateKind === "serial") return Date.UTC(y, m - 1, d) / 86400000 + 25569;
    return dmySlash ? `${pad(d)}/${pad(m)}/${y}` : dmyDash ? `${pad(d)}-${pad(m)}-${y}` : iso_;
  };
  const priceVal = (v) => {
    const x = Math.round(v / mult);
    return priceAsNumber ? x : withRs ? `Rs ${x} / Quintal` : String(x);
  };

  fresh.forEach((r, i) => {
    const [date, , market, variety, min, max, avg, rawDistrict] = r;
    const row = ws.getRow(last + 1 + i);
    cells.forEach((_, c) => {
      const cell = row.getCell(c + 1);
      const src = styleRow.getCell(c + 1);
      if (src.style) cell.style = JSON.parse(JSON.stringify(src.style)); // same look as the row above
      let val = null;
      if (c === map.date) val = dateVal(date);
      else if (c === map.district) val = rawDistrict;
      else if (c === map.market) val = market;
      else if (c === map.variety) val = variety;
      else if (c === map.min) val = priceVal(min);
      else if (c === map.max) val = priceVal(max);
      else if (c === map.avg) val = priceVal(avg);
      else if (c === map.state) val = "Karnataka";
      else if (c === map.commodity) val = "Arecanut(Betelnut/Supari)";
      if (val !== null) cell.value = val;
    });
  });

  try {
    fs.copyFileSync(file, file.replace(/\.xlsx$/i, ".backup.xlsx")); // safety copy first
    await wb.xlsx.writeFile(file);
  } catch (e) {
    if (["EBUSY", "EPERM", "EACCES"].includes(e.code)) throw new Error(lockMsg(file));
    throw e;
  }
}

function appendHtm(file, html, enc, fresh) {
  let last = null;
  const tre = /<table[\s\S]*?<\/table>/gi;
  let tm;
  while ((tm = tre.exec(html))) {
    const rowRe = /<tr[\s\S]*?<\/tr>/gi;
    let rm, header = null, sample = null;
    while ((rm = rowRe.exec(tm[0]))) {
      const cells = cellsOf(rm[0]);
      if (!cells.length) continue;
      if (!header) { const mm = mapHeaders(cells); if (validMap(mm)) header = { cells, map: mm }; continue; }
      sample = cells; break;
    }
    if (header) last = { start: tm.index, text: tm[0], header, sample };
  }
  if (!last) throw new Error("Could not find the price table inside " + file);
  const { header, sample } = last;
  const dateSample = sample ? sample[header.map.date] || "" : "17/10/2026";
  const priceSample = sample ? sample[header.map.avg] || "" : "1";
  const dmySlash = /^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateSample);
  const dmyDash = /^\d{1,2}-\d{1,2}-\d{4}/.test(dateSample);
  const withRs = /rs/i.test(priceSample);
  const fmtDate = (d) => (dmySlash ? d.split("-").reverse().join("/") : dmyDash ? d.split("-").reverse().join("-") : d);
  const fmtPrice = (v) => (withRs ? `Rs ${Math.round(v)} / Quintal` : String(Math.round(v)));
  const trs = fresh.map((r) => {
    const [date, , market, variety, min, max, avg, rawDistrict] = r;
    const m = header.map;
    const cells = header.cells.map((_, i) => {
      if (i === m.date) return fmtDate(date);
      if (i === m.district) return rawDistrict;
      if (i === m.market) return market;
      if (i === m.variety) return variety;
      if (i === m.min) return fmtPrice(min);
      if (i === m.max) return fmtPrice(max);
      if (i === m.avg) return fmtPrice(avg);
      if (i === m.state) return "Karnataka";
      if (i === m.commodity) return "Arecanut(Betelnut/Supari)";
      return "";
    });
    return "<tr>" + cells.map((c) => `<td>${c}</td>`).join("") + "</tr>\n";
  }).join("");
  const lower = last.text.toLowerCase();
  const k = lower.lastIndexOf("</tbody>");
  const cut = k >= 0 ? k : lower.lastIndexOf("</table>");
  const tableOut = last.text.slice(0, cut) + trs + last.text.slice(cut);
  try {
    fs.copyFileSync(file, file.replace(/\.htm(l?)$/i, ".backup.htm$1"));
    fs.writeFileSync(file, html.slice(0, last.start) + tableOut + html.slice(last.start + last.text.length), enc);
  } catch (e) {
    if (["EBUSY", "EPERM", "EACCES"].includes(e.code)) throw new Error(lockMsg(file));
    throw e;
  }
}

async function appendRows(newRows) {
  const { rows: existing, perFile, prebuilt } = await loadRows();
  if (prebuilt) throw new Error("This server only has the read-only prices.json. Update prices on your PC, run  npm run build-data  and push to GitHub.");
  const have = new Set(existing.map(keyOf));
  const fresh = newRows.filter((r) => !have.has(keyOf(r)));
  if (!fresh.length) return 0;
  const file = Object.keys(perFile).sort((a, b) => perFile[b] - perFile[a])[0]; // file holding most rows
  if (/\.xlsx$/i.test(file)) await appendXlsx(file, fresh);
  else { const { text, enc } = readText(file); appendHtm(file, text, enc, fresh); }
  return fresh.length;
}

// write data/prices.json (all rows, compact) from the Excel/HTML source
async function buildPrebuilt() {
  const r = await loadRows();
  if (r.prebuilt) throw new Error("No Excel/HTML dataset found on this machine - nothing to build from.");
  fs.mkdirSync(path.dirname(PREBUILT_PATH), { recursive: true });
  fs.writeFileSync(PREBUILT_PATH, JSON.stringify({ builtAt: new Date().toISOString(), source: r.file, rows: r.rows }));
  return { rows: r.rows.length, file: PREBUILT_PATH, bytes: fs.statSync(PREBUILT_PATH).size };
}

module.exports = {
  buildPrebuilt,
  KARNATAKA_DISTRICTS, canonDistrict, districtFor, parseHtml, parseXlsx, readWorkbook, detectHeader, cellValue,
  loadRows, appendRows, resolveDatasetPath, listSourceFiles, readText, cellsOf, mapHeaders, validMap, parseDate,
};