const { Pool } = require("pg");
require("dotenv").config();
const fs = require("fs").promises;
const path = require("path");

async function setupDatabase() {
  console.log("🚀 Setting up MiniShop database on Aiven PostgreSQL...");
  console.log("📡 Connecting to:", process.env.DB_HOST);

  // Kết nối đến database defaultdb
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || "defaultdb",
    ssl:
      process.env.DB_SSL === "true"
        ? {
            rejectUnauthorized: false,
          }
        : false,
    connectionTimeoutMillis: 10000,
    idleTimeoutMillis: 30000,
  });

  try {
    const client = await pool.connect();
    console.log("✅ Connected to Aiven PostgreSQL database");

    // 1. Kiểm tra version
    const version = await client.query("SELECT version()");
    console.log(
      "📊 PostgreSQL Version:",
      version.rows[0].version.split(",")[0]
    );

    // 2. Kiểm tra các bảng hiện có
    console.log("📋 Checking existing tables...");
    const existingTables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);

    if (existingTables.rows.length > 0) {
      console.log(
        "⚠️ Existing tables found:",
        existingTables.rows.map((r) => r.table_name).join(", ")
      );

      // Hỏi người dùng có muốn xóa không
      const readline = require("readline").createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise((resolve) => {
        readline.question(
          "❓ Do you want to drop existing tables? (yes/no): ",
          resolve
        );
      });
      readline.close();

      if (answer.toLowerCase() === "yes") {
        console.log("🗑️ Dropping existing tables...");
        await client.query("DROP TABLE IF EXISTS order_items CASCADE");
        await client.query("DROP TABLE IF EXISTS orders CASCADE");
        await client.query("DROP TABLE IF EXISTS products CASCADE");
        await client.query("DROP TABLE IF EXISTS users CASCADE");
        console.log("✅ Existing tables dropped");
      } else {
        console.log(
          "⚠️ Keeping existing tables, setup may fail if tables exist"
        );
      }
    }

    // 3. Đọc file SQL
    const sqlPath = path.join(__dirname, "database.sql");
    console.log(`📝 Reading SQL file: ${sqlPath}`);

    let sql;
    try {
      sql = await fs.readFile(sqlPath, "utf8");
    } catch (err) {
      console.error("❌ Cannot read database.sql file:", err.message);
      console.log("📝 Creating default SQL content...");
      // Tạo SQL mặc định nếu file không tồn tại
      sql = `
        -- Default SQL for MiniShop
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            phone VARCHAR(20),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        INSERT INTO users (email, password, name) VALUES 
        ('test@example.com', 'hashed_password', 'Test User');
        
        SELECT 'Default setup complete' as message;
      `;
    }

    // 4. Chia và thực thi SQL
    console.log("⚡ Executing SQL statements...");
    const statements = sql
      .split(";")
      .map((stmt) => stmt.trim())
      .filter((stmt) => stmt.length > 0);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (!statement) continue;

      try {
        await client.query(statement + ";");
        successCount++;
        console.log(`✅ Statement ${i + 1}/${statements.length} executed`);
      } catch (err) {
        errorCount++;
        console.log(
          `⚠️ Statement ${i + 1} skipped:`,
          err.message.split("\n")[0]
        );
      }
    }

    // 5. Kiểm tra kết quả
    console.log("\n📊 Execution Summary:");
    console.log(`   Success: ${successCount}`);
    console.log(`   Skipped: ${errorCount}`);

    // 6. Hiển thị dữ liệu đã tạo
    console.log("\n📦 Verifying created data...");

    try {
      const tables = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);

      console.log(
        "📋 Tables created:",
        tables.rows.map((row) => row.table_name).join(", ")
      );

      // Đếm từng bảng
      for (const table of tables.rows) {
        try {
          const countResult = await client.query(
            `SELECT COUNT(*) FROM ${table.table_name}`
          );
          console.log(
            `   ${table.table_name}: ${countResult.rows[0].count} records`
          );
        } catch (err) {
          console.log(`   ${table.table_name}: Error counting`);
        }
      }

      // Hiển thị vài sản phẩm mẫu
      console.log("\n🛍️ Sample Products:");
      const sampleProducts = await client.query(
        "SELECT id, name, price FROM products LIMIT 3"
      );
      sampleProducts.rows.forEach((product) => {
        console.log(`   ${product.id}. ${product.name} - ${product.price}`);
      });
    } catch (err) {
      console.log("⚠️ Could not verify data:", err.message);
    }

    client.release();
    console.log("\n🎉 Database setup completed successfully!");
    console.log("🌐 Start server with: npm run dev");
    console.log(
      "📡 API will be available at: http://localhost:" +
        (process.env.PORT || 5000)
    );
  } catch (error) {
    console.error("\n❌ Database setup failed:", error.message);

    // Gợi ý khắc phục
    console.log("\n🔧 Troubleshooting tips:");
    console.log("   1. Check your Aiven credentials in .env file");
    console.log("   2. Verify Aiven PostgreSQL service is running");
    console.log("   3. Check if IP is whitelisted in Aiven console");
    console.log("   4. Try connecting with psql command:");
    console.log(
      `      psql "postgresql://${process.env.DB_USER}:YOUR_PASSWORD@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=require"`
    );

    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Chạy setup
setupDatabase();
