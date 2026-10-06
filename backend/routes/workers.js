// ============================================================
// routes/workers.js
// PURPOSE: Add and retrieve worker daily kg records
//
// ROUTES:
//   GET  /api/workers?company=&managerName= → all workers for manager
//   GET  /api/workers/my?company=&name=     → own record only
//   POST /api/workers                       → add/update entry
//
// STEP BY STEP (POST — Add Worker Entry):
// 1. protect() middleware verifies JWT token
// 2. Receive company, managerName, slNo, workerName, date, kg, pricePerKg
// 3. Find existing WorkerRow for this worker
// 4. If not exists → create new WorkerRow
// 5. Add kg to that date in the days Map
// 6. Recalculate totalKg and totalPrice
// 7. Save to MongoDB
// ============================================================

const express   = require("express");
const router    = express.Router();
const WorkerRow = require("../models/WorkerRow");
const { protect } = require("../middleware/auth");

// ─────────────────────────────────────────────────────────
// GET /api/workers?company=xxx&managerName=xxx
// Returns all worker rows for a company/manager
// ─────────────────────────────────────────────────────────
router.get("/", protect, async (req, res) => {
  try {
    const { company, managerName } = req.query;
    const query = { company: company.toLowerCase() };
    if (managerName) query.managerName = managerName.toLowerCase();

    // Find all matching documents, sorted by sl number
    const rows = await WorkerRow.find(query).sort({ slNo: 1 });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// GET /api/workers/my?company=xxx&managerName=xxx&name=xxx
// Worker sees only their own record
// ─────────────────────────────────────────────────────────
router.get("/my", protect, async (req, res) => {
  try {
    const { company, managerName, name } = req.query;
    const row = await WorkerRow.findOne({
      company:     company.toLowerCase(),
      managerName: managerName.toLowerCase(),
      name:        name.toLowerCase(),
    });
    res.json({ success: true, data: row || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/workers
// Add or update a worker's daily kg entry
// ─────────────────────────────────────────────────────────
router.post("/", protect, async (req, res) => {
  try {
    const { company, managerName, slNo, workerName, date, kg, pricePerKg } = req.body;

    // STEP 1: Validate required fields
    if (!company || !managerName || !slNo || !workerName || !date || !kg) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const companyLower = company.toLowerCase();
    const managerLower = managerName.toLowerCase();
    const nameLower    = workerName.toLowerCase().trim();

    // STEP 2: Find existing row OR create new one
    // findOne returns null if not found
    let row = await WorkerRow.findOne({
      company:     companyLower,
      managerName: managerLower,
      slNo:        String(slNo),
      name:        nameLower,
    });

    if (!row) {
      // First time this worker → create new document
      row = new WorkerRow({
        company:    companyLower,
        managerName: managerLower,
        slNo:       String(slNo),
        name:       nameLower,
        days:       {},
        totalKg:    0,
        pricePerKg: 0,
        totalPrice: 0,
      });
    }

    // STEP 3: Add kg for this specific date
    // If manager enters for same date again → adds to existing
    const existingKg = row.days.get(date) || 0;
    row.days.set(date, existingKg + Number(kg));

    // STEP 4: Recalculate totals
    row.pricePerKg = Number(pricePerKg);
    row.totalKg    = Array.from(row.days.values()).reduce((s, v) => s + v, 0);
    row.totalPrice = row.totalKg * row.pricePerKg;

    // Must call markModified for Map type fields
    row.markModified("days");

    // STEP 5: Save to MongoDB
    await row.save();

    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;