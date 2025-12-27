const { Pool } = require("pg");
require("dotenv").config();

async function testConnection() {
  console.log("🔍 Testing Aiven PostgreSQL connection...");

  const config = {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "defaultdb",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  };

  console.log("Connecting to:", config.host);

  const pool = new Pool(config);

  try {
    const client = await pool.connect();
    console.log("✅ Connection successful!");

    // Test version
    const version = await client.query("SELECT version()");
    console.log("📊 PostgreSQL:", version.rows[0].version.split(",")[0]);

    // Test tables
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    if (tables.rows.length > 0) {
      console.log(
        "📋 Existing tables:",
        tables.rows.map((r) => r.table_name).join(", ")
      );
    } else {
      console.log('📋 No tables found, run "npm run setup-db" to create');
    }

    client.release();
    await pool.end();

    console.log("🎉 Connection test passed!");
  } catch (error) {
    console.error("❌ Connection failed:", error.message);

    // Kiểm tra lỗi cụ thể
    if (error.code === "ETIMEDOUT") {
      console.log("💡 Tip: Check if IP is whitelisted in Aiven Console");
    } else if (error.code === "28P01") {
      console.log("💡 Tip: Check username/password in .env file");
    } else if (error.code === "3D000") {
      console.log("💡 Tip: Database might not exist, using defaultdb");
    }

    await pool.end();
    process.exit(1);
  }
}

testConnection();
