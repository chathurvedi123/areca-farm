// ============================================================
// routes/prices.js
//   GET  /api/prices/status      -> is the dataset loaded?
//   GET  /api/prices/districts   -> all districts + latest price
//   GET  /api/prices/predict?district=&variety=&days=
//   POST /api/prices/refresh     -> owner only: update from web
// ============================================================
const express = require("express");
const router = express.Router();
const prices = require("../services/priceService");
const { protect, requireRole } = require("../middleware/auth");

const ready = (req, res, next) =>
  prices.isReady()
    ? next()
    : res.status(503).json({ error: "Price data is still loading", loading: true, status: prices.status() });

router.get("/status", (req, res) => res.json(prices.status()));

router.get("/districts", ready, (req, res) => res.json(prices.districts()));

router.get("/predict", ready, (req, res) => {
  try {
    const days = parseInt(req.query.days, 10);
    if (!req.query.district) return res.status(400).json({ error: "district is required" });
    if (!days || days < 1 || days > 3650) return res.status(400).json({ error: "days must be 1 to 3650" });
    res.json(prices.predict(req.query.district, req.query.variety, days));
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

router.post("/refresh", protect, requireRole("owner"), async (req, res) => {
  try {
    res.json(await prices.refresh());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;