const express = require("express");
const router = express.Router();

// Get all products
router.get("/", async (req, res) => {
  try {
    console.log("📦 Fetching products...");

    // Kiểm tra req.pool có tồn tại không
    if (!req.pool) {
      console.error("❌ req.pool is undefined!");
      return res.status(500).json({
        error: "Database connection not available",
        message: "req.pool is undefined",
      });
    }

    // Kiểm tra bảng tồn tại trước
    try {
      const tableCheck = await req.pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'products'
        )
      `);

      if (!tableCheck.rows[0].exists) {
        console.log("📝 Creating products table...");
        // Tạo bảng nếu chưa có
        await req.pool.query(`
          CREATE TABLE IF NOT EXISTS products (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            price DECIMAL(10,2) NOT NULL,
            image_url VARCHAR(500),
            stock_quantity INTEGER DEFAULT 0,
            category VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);

        // Thêm dữ liệu mẫu
        await req.pool.query(`
          INSERT INTO products (name, description, price, image_url, stock_quantity, category) VALUES
          ('Laptop Dell XPS 13', 'Laptop cao cấp với màn hình InfinityEdge', 29990000, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853', 10, 'Electronics'),
          ('iPhone 15 Pro', 'Điện thoại flagship của Apple', 32990000, 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9', 15, 'Mobile'),
          ('Samsung Galaxy Watch', 'Smartwatch với nhiều tính năng sức khỏe', 8990000, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30', 20, 'Wearables'),
          ('AirPods Pro', 'Tai nghe không dây chống ồn', 7490000, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e', 30, 'Audio'),
          ('MacBook Air M2', 'Laptop siêu mỏng nhẹ', 35990000, 'https://images.unsplash.com/photo-1542393545-10f5cde2c810', 5, 'Electronics')
        `);

        console.log("✅ Created products table with sample data");
      }
    } catch (tableError) {
      console.log("⚠️ Could not check/create table:", tableError.message);
      // Tiếp tục thử query dù không tạo được bảng
    }

    const result = await req.pool.query(
      "SELECT * FROM products ORDER BY created_at DESC"
    );

    console.log(`✅ Found ${result.rows.length} products`);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Get products error:", error.message);
    console.error("Error code:", error.code);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      sslError:
        error.message.includes("certificate") || error.message.includes("SSL"),
    });

    res.status(500).json({
      error: "Failed to fetch products",
      message: error.message,
      code: error.code,
      suggestion: error.message.includes("certificate")
        ? "SSL certificate issue. Check CA certificate from Aiven."
        : "Check database connection and table existence.",
    });
  }
});

// Get single product by ID
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.pool) {
      return res
        .status(500)
        .json({ error: "Database connection not available" });
    }

    const result = await req.pool.query(
      "SELECT * FROM products WHERE id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Get product error:", error);
    res.status(500).json({
      error: "Failed to fetch product",
      details: error.message,
    });
  }
});

// Get products by category
router.get("/category/:category", async (req, res) => {
  try {
    const { category } = req.params;

    if (!req.pool) {
      return res
        .status(500)
        .json({ error: "Database connection not available" });
    }

    const result = await req.pool.query(
      "SELECT * FROM products WHERE category = $1 ORDER BY created_at DESC",
      [category]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Get products by category error:", error);
    res.status(500).json({
      error: "Failed to fetch products by category",
      details: error.message,
    });
  }
});

// Search products
router.get("/search/:query", async (req, res) => {
  try {
    const { query } = req.params;

    if (!req.pool) {
      return res
        .status(500)
        .json({ error: "Database connection not available" });
    }

    const result = await req.pool.query(
      "SELECT * FROM products WHERE name ILIKE $1 OR description ILIKE $1 ORDER BY created_at DESC",
      [`%${query}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("❌ Search products error:", error);
    res.status(500).json({
      error: "Failed to search products",
      details: error.message,
    });
  }
});

// Create new product
router.post("/", async (req, res) => {
  try {
    const { name, description, price, image_url, stock_quantity, category } =
      req.body;

    // Validate required fields
    if (!name || !price) {
      return res.status(400).json({
        error: "Validation error",
        message: "Name and price are required",
      });
    }

    if (!req.pool) {
      return res
        .status(500)
        .json({ error: "Database connection not available" });
    }

    const result = await req.pool.query(
      `INSERT INTO products 
       (name, description, price, image_url, stock_quantity, category) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        name,
        description,
        price,
        image_url,
        stock_quantity || 0,
        category || "Uncategorized",
      ]
    );

    console.log(`✅ Created product: ${result.rows[0].name}`);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Create product error:", error);
    res.status(500).json({
      error: "Failed to create product",
      details: error.message,
    });
  }
});

// Update product
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, price, image_url, stock_quantity, category } =
      req.body;

    if (!req.pool) {
      return res
        .status(500)
        .json({ error: "Database connection not available" });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description);
      paramCount++;
    }
    if (price !== undefined) {
      updates.push(`price = $${paramCount}`);
      values.push(price);
      paramCount++;
    }
    if (image_url !== undefined) {
      updates.push(`image_url = $${paramCount}`);
      values.push(image_url);
      paramCount++;
    }
    if (stock_quantity !== undefined) {
      updates.push(`stock_quantity = $${paramCount}`);
      values.push(stock_quantity);
      paramCount++;
    }
    if (category !== undefined) {
      updates.push(`category = $${paramCount}`);
      values.push(category);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: "No fields to update" });
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE products 
      SET ${updates.join(", ")}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await req.pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    console.log(`✅ Updated product ID: ${id}`);
    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Update product error:", error);
    res.status(500).json({
      error: "Failed to update product",
      details: error.message,
    });
  }
});

// Delete product
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.pool) {
      return res
        .status(500)
        .json({ error: "Database connection not available" });
    }

    const result = await req.pool.query(
      "DELETE FROM products WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    console.log(`✅ Deleted product ID: ${id}`);
    res.json({
      success: true,
      message: "Product deleted successfully",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Delete product error:", error);
    res.status(500).json({
      error: "Failed to delete product",
      details: error.message,
    });
  }
});

// Get product statistics
router.get("/stats/summary", async (req, res) => {
  try {
    if (!req.pool) {
      return res
        .status(500)
        .json({ error: "Database connection not available" });
    }

    const stats = await req.pool.query(`
      SELECT 
        COUNT(*) as total_products,
        COALESCE(SUM(stock_quantity), 0) as total_stock,
        COALESCE(AVG(price), 0) as average_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        COUNT(DISTINCT category) as categories_count
      FROM products
    `);

    res.json(stats.rows[0]);
  } catch (error) {
    console.error("❌ Get stats error:", error);
    res.status(500).json({
      error: "Failed to get statistics",
      details: error.message,
    });
  }
});

// Get categories
router.get("/categories/all", async (req, res) => {
  try {
    if (!req.pool) {
      return res
        .status(500)
        .json({ error: "Database connection not available" });
    }

    const categories = await req.pool.query(`
      SELECT DISTINCT category, COUNT(*) as product_count
      FROM products 
      WHERE category IS NOT NULL 
      GROUP BY category 
      ORDER BY category
    `);

    res.json(categories.rows);
  } catch (error) {
    console.error("❌ Get categories error:", error);
    res.status(500).json({
      error: "Failed to get categories",
      details: error.message,
    });
  }
});

module.exports = router;
