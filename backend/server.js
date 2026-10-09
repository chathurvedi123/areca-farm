// ============================================================
// server.js
// PURPOSE: Main entry point — starts the Express web server
//
// STEP BY STEP:
// 1. Load environment variables from .env file
// 2. Connect to MongoDB
// 3. Create Express app
// 4. Add middleware (CORS, JSON parser)
// 5. Register all routes under /api/...
// 6. Add 404 and error handlers
// 7. Start server on PORT 5000
//
// HOW EXPRESS WORKS:
// Every HTTP request goes through middleware in ORDER:
//   Request → CORS → JSON parser → Route → Handler → Response
// ============================================================

const express   = require("express");
const cors      = require("cors");
const dotenv    = require("dotenv");
const connectDB = require("./config/db");

// STEP 1: Load .env file variables into process.env
dotenv.config();

// STEP 2: Connect to MongoDB
connectDB();

// STEP 3: Create Express application
const app = express();

// ── STEP 4: Middleware ────────────────────────────────────
// CORS: Allow requests from React frontend (port 5000)
app.use(cors());

// Parse incoming JSON request bodies
// Without this: req.body would be undefined
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ── STEP 5: Routes ────────────────────────────────────────
// All routes are prefixed with /api/
// Each route file handles a specific feature
app.use("/api/auth",    require("./routes/auth"));    // register, login
app.use("/api/workers", require("./routes/workers")); // worker records
app.use("/api/farmers", require("./routes/farmers")); // farmer records
app.use("/api/owner",   require("./routes/owner"));   // owner dashboard

// Health check — visit https://areca-farm.onrender.com: to verify
app.get("/", (req, res) => {
  res.json({
    message: "🌿 Areca Farm Management API is running",
    endpoints: {
      auth:    "POST /api/auth/register | POST /api/auth/login",
      workers: "GET /api/workers | POST /api/workers",
      farmers: "GET /api/farmers | POST /api/farmers",
      owner:   "GET /api/owner/stats | POST /api/owner/generate-code",
    },
  });
});

// ── STEP 6: Error Handlers ────────────────────────────────
// 404 — Route not found
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});

// 500 — Server error (catches crashes in route handlers)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Server error" });
});

// ── STEP 7: Start Server ──────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 MongoDB: ${process.env.MONGO_URI}`);
  console.log(`🌐 Frontend: ${process.env.FRONTEND_URL}\n`);
});