// ============================================================
// routes/auth.js
// PURPOSE: Handle user registration and login
//
// ROUTES:
//   POST /api/auth/register           → create new user
//   POST /api/auth/login              → login, get token
//   POST /api/auth/verify-manager-code → check manager code
//
// STEP BY STEP (Register):
// 1. Receive name, phone, role, company, username, password
// 2. Validate all fields present
// 3. Check no duplicate username in same company
// 4. Role-specific checks (owner/manager/worker/farmer)
// 5. Create user (password auto-hashed by model pre-save hook)
// 6. Return JWT token + user data
//
// STEP BY STEP (Login):
// 1. Find user by username + role + company in MongoDB
// 2. Compare entered password with stored hash (bcrypt)
// 3. Generate JWT token
// 4. Return token + user data
// ============================================================

const express      = require("express");
const router       = express.Router();
const jwt          = require("jsonwebtoken");
const User         = require("../models/User");
const ManagerCode  = require("../models/ManagerCode");

// Helper: generate a JWT token for a user
const generateToken = (id) => {
  return jwt.sign(
    { id },                          // payload = user ID
    process.env.JWT_SECRET,          // secret key from .env
    { expiresIn: "7d" }              // expires in 7 days
  );
};

// ─────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, phone, role, company, managerName, username, password, code } = req.body;

    // STEP 1: Check all required fields
    if (!name || !phone || !role || !company || !username || !password) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const companyLower  = company.toLowerCase().trim();
    const usernameLower = username.toLowerCase().trim();

    // STEP 2: Check duplicate username in same company + role
    const exists = await User.findOne({
      username: usernameLower,
      company: companyLower,
      role,
    });
    if (exists) {
      return res.status(400).json({ error: "Username already exists for this company" });
    }

    // STEP 3a: Owner — only 1 owner per company allowed
    if (role === "owner") {
      const ownerExists = await User.findOne({ role: "owner", company: companyLower });
      if (ownerExists) {
        return res.status(400).json({ error: "Owner already registered for this company" });
      }
    }

    // STEP 3b: Manager — must have valid company code from owner
    if (role === "manager") {
      if (!code) return res.status(400).json({ error: "Manager code is required" });
      const validCode = await ManagerCode.findOne({
        company: companyLower,
        code: code.toUpperCase().trim(),
      });
      if (!validCode) {
        return res.status(400).json({ error: "Invalid manager code for this company" });
      }
    }

    // STEP 3c: Worker/Farmer — manager must exist in DB
    if (role === "worker" || role === "farmer") {
      if (!managerName) {
        return res.status(400).json({ error: "Manager name is required" });
      }
      const manager = await User.findOne({
        role: "manager",
        company: companyLower,
        name: new RegExp(`^${managerName.trim()}$`, "i"), // case-insensitive match
      });
      if (!manager) {
        return res.status(400).json({ error: "Manager not found for this company" });
      }
    }

    // STEP 4: Create user (password hashed automatically in model)
    const user = await User.create({
      name:        name.trim(),
      phone:       phone.trim(),
      role,
      company:     companyLower,
      managerName: managerName ? managerName.toLowerCase().trim() : "",
      username:    usernameLower,
      password,    // ← raw password; model hashes it before saving
    });

    // STEP 5: Generate token and return response
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: "Registration successful",
      token,
      user: {
        id:          user._id,
        name:        user.name,
        role:        user.role,
        company:     user.company,
        username:    user.username,
        managerName: user.managerName,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { username, password, role, company, managerName } = req.body;

    if (!username || !password || !role || !company) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // STEP 1: Build query based on role
    const query = {
      username: username.toLowerCase().trim(),
      role,
      company:  company.toLowerCase().trim(),
    };
    // Worker/Farmer also need managerName to match
    if ((role === "worker" || role === "farmer") && managerName) {
      query.managerName = managerName.toLowerCase().trim();
    }

    // STEP 2: Find user in MongoDB
    const user = await User.findOne(query);
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // STEP 3: Compare password using bcrypt
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // STEP 4: Mark manager attendance
    if (role === "manager") {
      const today = new Date().toISOString().slice(0, 10);
      user.attendance.set(today, "Present");
      await user.save();
    }

    // STEP 5: Return token + user
    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id:          user._id,
        name:        user.name,
        role:        user.role,
        company:     user.company,
        username:    user.username,
        managerName: user.managerName,
        lastModule:  user.lastModule,
        attendance:  Object.fromEntries(user.attendance),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// POST /api/auth/verify-manager-code
// Called before manager login to verify company + code
// ─────────────────────────────────────────────────────────
router.post("/verify-manager-code", async (req, res) => {
  try {
    const { company, code } = req.body;
    const companyLower = company.toLowerCase().trim();

    // Check owner exists for this company
    const owner = await User.findOne({ role: "owner", company: companyLower });
    if (!owner) {
      return res.status(400).json({ error: "Company owner not registered" });
    }

    // Check code exists
    const validCode = await ManagerCode.findOne({
      company: companyLower,
      code: code.toUpperCase().trim(),
    });
    if (!validCode) {
      return res.status(400).json({ error: "Invalid code for this company" });
    }

    res.json({ success: true, company: companyLower });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;