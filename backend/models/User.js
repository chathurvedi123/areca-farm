// ============================================================
// models/User.js
// PURPOSE: Define what a User looks like in MongoDB
//
// STEP BY STEP:
// 1. Import mongoose and bcryptjs
// 2. Create a Schema — blueprint for user data
// 3. Add pre-save hook — hashes password before saving
// 4. Add method — compare password on login
// 5. Export the model so routes can use it
//
// A Schema = a form template that MongoDB must follow
// ============================================================

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

// Define the shape of a User document in MongoDB
const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    phone: {
      type: String,
      required: [true, "Phone is required"],
    },
    role: {
      type: String,
      // Only these 4 values allowed
      enum: ["owner", "manager", "worker", "farmer"],
      required: true,
    },
    company: {
      type: String,
      required: true,
      lowercase: true, // Always stored lowercase
      trim: true,
    },
    managerName: {
      type: String,
      default: "",
      lowercase: true,
    },
    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 4,
    },
    // attendance = { "2026-06-15": "Present", "2026-06-16": "Present" }
    attendance: {
      type: Map,
      of: String,
      default: {},
    },
    lastModule: {
      type: String,
      default: "home",
    },
  },
  { timestamps: true } // Auto adds createdAt and updatedAt fields
);

// ── STEP: Hash password before saving ──────────────────────
// This runs automatically every time .save() is called
// "pre" means BEFORE saving to database
UserSchema.pre("save", async function (next) {
  // Only hash if password was changed (not on attendance updates)
  if (!this.isModified("password")) return next();

  // genSalt(10) = how complex the hash is (10 is standard)
  const salt = await bcrypt.genSalt(10);
  // Replace plain text password with hashed version
  this.password = await bcrypt.hash(this.password, salt);
  next(); // Continue saving
});

// ── STEP: Method to check password on login ────────────────
// Called as: user.matchPassword("1234")
UserSchema.methods.matchPassword = async function (enteredPassword) {
  // bcrypt.compare compares plain text with stored hash
  return await bcrypt.compare(enteredPassword, this.password);
};

// Create and export the model
// "User" = collection name in MongoDB will be "users"
module.exports = mongoose.model("User", UserSchema);