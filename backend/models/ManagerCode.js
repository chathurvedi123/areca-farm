// ============================================================
// models/ManagerCode.js
// PURPOSE: Store codes that owner generates for managers
//
// STEP BY STEP:
// 1. Owner generates a random code (e.g. "AB1X9K")
// 2. Code is saved here with company name
// 3. Manager must enter this code to register
// 4. Backend checks this collection to verify the code
// ============================================================

const mongoose = require("mongoose");

const ManagerCodeSchema = new mongoose.Schema(
  {
    company:   { type: String, required: true, lowercase: true },
    code:      { type: String, required: true, uppercase: true },
    createdBy: { type: String, required: true }, // owner name
  },
  { timestamps: true }
);

module.exports = mongoose.model("ManagerCode", ManagerCodeSchema);