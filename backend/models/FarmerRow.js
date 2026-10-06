// ============================================================
// models/FarmerRow.js
// PURPOSE: Store harvest quintal records for each farmer
//
// STEP BY STEP:
// 1. harvests = array of 5 numbers (up to 5 harvests per season)
// 2. totalQuintal = sum of all harvests
// 3. New harvests ADD to existing (accumulate over time)
// ============================================================

const mongoose = require("mongoose");

const FarmerRowSchema = new mongoose.Schema(
  {
    company:     { type: String, required: true, lowercase: true },
    managerName: { type: String, required: true, lowercase: true },
    slNo:        { type: String, required: true },
    name:        { type: String, required: true, lowercase: true },

    // Array of 5 harvest quintal values
    // harvests[0] = harvest 1 quintal, harvests[1] = harvest 2, etc.
    harvests: {
      type: [Number],
      default: [0, 0, 0, 0, 0],
    },

    totalQuintal: { type: Number, default: 0 },
  },
  { timestamps: true }
);

FarmerRowSchema.index(
  { company: 1, managerName: 1, slNo: 1, name: 1 },
  { unique: true }
);

module.exports = mongoose.model("FarmerRow", FarmerRowSchema);