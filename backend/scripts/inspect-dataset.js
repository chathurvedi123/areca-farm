// Run:  node scripts/inspect-dataset.js
// Shows what the loader sees in your dataset (Excel .xlsx or HTML export).
require("dotenv").config();
const fs = require("fs");
const ds = require("../services/dataset");

(async () => {
  const files = ds.listSourceFiles();
  if (!files.length) {
    console.log("No dataset found.\nExpected  D:\\dataset for areca\\dataset.xlsx\nor set DATASET_PATH in backend/.env (a file OR a folder).");
    process.exit(1);
  }
  console.log("Files that will be read:");
  for (const f of files) {
    console.log(`\n== ${f}  (${(fs.statSync(f).size / 1e6).toFixed(2)} MB)`);
    if (/\.xlsx$/i.test(f)) {
      const wb = await ds.readWorkbook(f);
      const { sheets } = await ds.parseXlsx(f);
      wb.eachSheet((ws) => {
        const info = sheets.find((s) => s.name === ws.name) || {};
        console.log(`  Sheet "${ws.name}": ${ws.rowCount} rows x ${ws.columnCount} cols -> ${info.count || 0} price rows` + (info.note ? ` (${info.note})` : ""));
        if (info.headers) console.log("    header row", info.headerRow, ":", JSON.stringify(info.headers), "\n    understood as:", JSON.stringify(info.map));
        console.log("    first rows as the loader sees them:");
        for (let r = 1; r <= Math.min(ws.rowCount, (info.headerRow || 1) + 3); r++) {
          const vals = (ws.getRow(r).values || []).slice(1).map((v) => { const c = ds.cellValue(v); return c instanceof Date ? c.toISOString().slice(0, 10) + " [date cell]" : c; });
          console.log("     ", r, JSON.stringify(vals).slice(0, 230));
        }
      });
    } else {
      const { text } = ds.readText(f);
      console.log("  HTML file,", ds.parseHtml(text).length, "price rows");
    }
  }
  const { rows } = await ds.loadRows();
  console.log("\nTOTAL price rows:", rows.length);
  const d = rows.map((r) => r[0]).sort();
  console.log("Date range:", d[0], "->", d[d.length - 1]);
  const per = {}, vars = {};
  rows.forEach((r) => { per[r[1]] = (per[r[1]] || 0) + 1; vars[r[3]] = (vars[r[3]] || 0) + 1; });
  console.log("Rows per district:", per);
  console.log("Varieties:", vars);
  console.log("Last row [date, district, market, variety, min, max, avg]:", JSON.stringify(rows[rows.length - 1].slice(0, 7)));
})().catch((e) => { console.error("ERROR:", e.message); process.exit(1); });