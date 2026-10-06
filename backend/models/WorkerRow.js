// ============================================================
// models/WorkerRow.js
// PURPOSE: Store daily kg work records for each worker
//
// STEP BY STEP:
// 1. One document per unique worker (company+manager+slNo+name)
// 2. days = Map of { date: kg } — grows every day manager adds
// 3. totalKg and totalPrice are recalculated each time
// 4. Unique compound index prevents duplicate worker records
// ============================================================

const mongoose = require("mongoose");

const WorkerRowSchema = new mongoose.Schema(
  {
    company:     { type: String, required: true, lowercase: true },
    managerName: { type: String, required: true, lowercase: true },
    slNo:        { type: String, required: true },
    name:        { type: String, required: true, lowercase: true },

    // days: { "2026-06-15": 45.5, "2026-06-16": 38.0 }
    // Map type = key-value pairs where key = date string
    days: {
      type: Map,
      of: Number,
      default: {},
    },

    totalKg:    { type: Number, default: 0 },
    pricePerKg: { type: Number, default: 0 },
    totalPrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Unique index: same worker cannot have 2 records for same company+manager
WorkerRowSchema.index(
  { company: 1, managerName: 1, slNo: 1, name: 1 },
  { unique: true }
);

module.exports = mongoose.model("WorkerRow", WorkerRowSchema);