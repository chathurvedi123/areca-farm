// Run:  npm run build-data      (or: node scripts/build-data.js)
// Reads your Excel dataset and writes backend/data/prices.json - a compact copy
// the deployed server (Render) loads instantly, without needing Excel or exceljs.
require("dotenv").config();
const ds = require("../services/dataset");
ds.buildPrebuilt()
  .then((r) => console.log(`✅ prices.json written: ${r.rows} rows, ${(r.bytes / 1e6).toFixed(1)} MB\n   ${r.file}\n   Now:  git add .  &&  git commit -m "update prices"  &&  git push`))
  .catch((e) => { console.error("ERROR:", e.message); process.exit(1); });