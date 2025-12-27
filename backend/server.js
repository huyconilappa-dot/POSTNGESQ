const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

/* ===================== MIDDLEWARE ===================== */
app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ===================== DATABASE (AIVEN POSTGRESQL) ===================== */
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: false, // Aiven yêu cầu SSL
    ca: fs.readFileSync(process.env.CA_CERT_PATH || "./ca.pem").toString(),
  },
  connectionTimeoutMillis: 20000,
  idleTimeoutMillis: 30000,
});

/* ===================== GẮN POOL VÀO REQUEST ===================== */
app.use((req, res, next) => {
  req.pool = pool;
  next();
});

/* ===================== ROUTES ===================== */
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/products", require("./routes/productRoutes"));
app.use("/api/orders", require("./routes/orderRoutes"));

/* ===================== HEALTH CHECK ===================== */
app.get("/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({
      status: "OK",
      message: "Server & PostgreSQL connected",
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      error: error.message,
    });
  }
});

/* ===================== START SERVER ===================== */
app.listen(PORT, async () => {
  console.log("======================================");
  console.log("🚀 SERVER STARTED SUCCESSFULLY");
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log("🗄️  Database: PostgreSQL (Aiven)");
  console.log("🔐 SSL: ENABLED");
  console.log("======================================");

  try {
    const result = await pool.query("SELECT version()");
    console.log("✅ PostgreSQL version:");
    console.log(result.rows[0].version);
  } catch (err) {
    console.error("❌ Database connection failed:", err.message);
  }
});

/* ===================== EXPORT (OPTIONAL) ===================== */
module.exports = { app, pool };
