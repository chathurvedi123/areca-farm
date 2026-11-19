const express   = require("express");
const cors      = require("cors");
const dotenv    = require("dotenv");
const connectDB = require("./config/db");
const prices    = require("./services/priceService");

dotenv.config();
connectDB();

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/api/auth",    require("./routes/auth"));
app.use("/api/workers", require("./routes/workers"));
app.use("/api/farmers", require("./routes/farmers"));
app.use("/api/owner",   require("./routes/owner"));
app.use("/api/prices",  require("./routes/prices"));

app.get("/", (req, res) => {
  res.json({ message: "🌿 Areca Farm Management API is running", prices: prices.status() });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.originalUrl} not found` });
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Server error" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  // Load the dataset + train all models ONCE (right after the server starts).
  setImmediate(async () => {
    await prices.init();
    if (prices.isReady()) prices.startAutoUpdate();
  });
});