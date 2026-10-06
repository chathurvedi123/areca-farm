// ============================================================
// config/db.js
// PURPOSE: Connect Node.js app to MongoDB database
//
// STEP BY STEP:
// 1. Import mongoose library (lets us talk to MongoDB)
// 2. Create async function connectDB
// 3. Try to connect using MONGO_URI from .env file
// 4. If success → print connected message
// 5. If fail → print error and stop server (process.exit)
// ============================================================

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // mongoose.connect() returns a connection object
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error(`❌ MongoDB Error: ${error.message}`);
    process.exit(1); // Stop server if DB fails
  }
};

module.exports = connectDB;