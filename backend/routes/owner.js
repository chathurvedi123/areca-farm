// ============================================================
// routes/owner.js
// PURPOSE: Owner-only routes for stats and manager codes
//
// ROUTES:
//   GET  /api/owner/stats          → dashboard stats
//   POST /api/owner/generate-code  → new manager code
//   GET  /api/owner/codes          → all codes
//
// STEP BY STEP (GET stats):
// 1. protect() verifies JWT
// 2. requireRole("owner") checks role === "owner"
// 3. Query all managers, workers, farmers for this company
// 4. Calculate totals
// 5. Return combined data to owner dashboard
// ============================================================

const express      = require("express");
const router       = express.Router();
const User         = require("../models/User");
const WorkerRow    = require("../models/WorkerRow");
const FarmerRow    = require("../models/FarmerRow");
const ManagerCode  = require("../models/ManagerCode");
const { protect, requireRole } = require("../middleware/auth");

// GET /api/owner/stats — full dashboard data
router.get("/stats", protect, requireRole("owner"), async (req, res) => {
  try {
    const company = req.user.company; // from JWT token

    // Run all queries at same time using Promise.all (faster)
    const [managers, workers, farmers, codes] = await Promise.all([
      User.find({ role: "manager", company }).select("name phone username attendance"),
      WorkerRow.find({ company }),
      FarmerRow.find({ company }),
      ManagerCode.find({ company }).sort({ createdAt: -1 }),
    ]);

    // Calculate summary numbers
    const totalKg      = workers.reduce((s, r) => s + r.totalKg,      0);
    const totalQuintal = farmers.reduce((s, r) => s + r.totalQuintal, 0);
    const totalValue   = workers.reduce((s, r) => s + r.totalPrice,   0);

    res.json({
      success: true,
      data: {
        managers: managers.map((m) => ({
          name:           m.name,
          phone:          m.phone,
          username:       m.username,
          attendanceDays: m.attendance ? m.attendance.size : 0,
        })),
        workers,
        farmers,
        codes,
        totalKg,
        totalQuintal,
        totalValue,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/owner/generate-code — create a new manager code
router.post("/generate-code", protect, requireRole("owner"), async (req, res) => {
  try {
    const company = req.user.company;

    // Generate random 6-character code (e.g. "AB1X9K")
    const code = Math.random().toString(36).slice(2, 8).toUpperCase();

    const managerCode = await ManagerCode.create({
      company,
      code,
      createdBy: req.user.name,
    });

    res.json({ success: true, data: managerCode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/owner/codes — list all codes for this company
router.get("/codes", protect, requireRole("owner"), async (req, res) => {
  try {
    const codes = await ManagerCode
      .find({ company: req.user.company })
      .sort({ createdAt: -1 });
    res.json({ success: true, data: codes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;