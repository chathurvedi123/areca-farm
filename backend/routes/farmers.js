// ============================================================
// routes/farmers.js
// PURPOSE: Add and retrieve farmer harvest quintal records
//
// ROUTES:
//   GET  /api/farmers?company=&managerName= → all farmers
//   GET  /api/farmers/my?company=&name=     → own record
//   POST /api/farmers                       → add harvest
//
// STEP BY STEP (POST):
// 1. Find or create FarmerRow for this farmer
// 2. Add new harvest quintals to existing harvests array
// 3. Recalculate totalQuintal
// 4. Save to MongoDB
// ============================================================

const express    = require("express");
const router     = express.Router();
const FarmerRow  = require("../models/FarmerRow");
const { protect } = require("../middleware/auth");

// GET /api/farmers?company=xxx&managerName=xxx
router.get("/", protect, async (req, res) => {
  try {
    const { company, managerName } = req.query;
    const query = { company: company.toLowerCase() };
    if (managerName) query.managerName = managerName.toLowerCase();
    const rows = await FarmerRow.find(query).sort({ slNo: 1 });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/farmers/my
router.get("/my", protect, async (req, res) => {
  try {
    const { company, managerName, name } = req.query;
    const row = await FarmerRow.findOne({
      company:     company.toLowerCase(),
      managerName: managerName.toLowerCase(),
      name:        name.toLowerCase(),
    });
    res.json({ success: true, data: row || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/farmers
router.post("/", protect, async (req, res) => {
  try {
    const { company, managerName, slNo, farmerName, harvests } = req.body;

    if (!company || !managerName || !slNo || !farmerName || !harvests) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const companyLower = company.toLowerCase();
    const managerLower = managerName.toLowerCase();
    const nameLower    = farmerName.toLowerCase().trim();

    // Find or create
    let row = await FarmerRow.findOne({
      company: companyLower, managerName: managerLower,
      slNo: String(slNo),   name: nameLower,
    });

    if (!row) {
      row = new FarmerRow({
        company: companyLower, managerName: managerLower,
        slNo: String(slNo),   name: nameLower,
        harvests: [0, 0, 0, 0, 0], totalQuintal: 0,
      });
    }

    // Add new harvest values to existing values
    row.harvests = row.harvests.map(
      (old, i) => Number(old || 0) + Number(harvests[i] || 0)
    );
    row.totalQuintal = row.harvests.reduce((s, v) => s + v, 0);

    await row.save();
    res.json({ success: true, data: row });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;