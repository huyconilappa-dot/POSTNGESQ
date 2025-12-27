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
    const tableCheck = await req.pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'products'
      )
    `);

    if (!tableCheck.rows[0].exists) {
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
        ('Samsung Galaxy Watch', 'Smartwatch với nhiều tính năng sức khỏe', 8990000, 'https://images.unsplash.com/photo-1523275335684-37898b6baf30', 20, 'Wearables')
      `);

      console.log("✅ Created products table with sample data");
    }

    const result = await req.pool.query(
      "SELECT * FROM products ORDER BY created_at DESC"
    );

    console.log(`✅ Found ${result.rows.length} products`);
    res.json(result.rows);
  } catch (error) {
    console.error("❌ Get products error:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({
      error: "Failed to fetch products",
      message: error.message,
      details: "Check if products table exists in database",
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
    res
      .status(500)
      .json({ error: "Failed to fetch product", details: error.message });
  }
});

// Create new product
router.post("/", async (req, res) => {
  try {
    const { name, description, price, image_url, stock_quantity, category } =
      req.body;

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
      [name, description, price, image_url, stock_quantity, category]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("❌ Create product error:", error);
    res
      .status(500)
      .json({ error: "Failed to create product", details: error.message });
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

    const result = await req.pool.query(
      `UPDATE products 
       SET name = $1, description = $2, price = $3, 
           image_url = $4, stock_quantity = $5, category = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 
       RETURNING *`,
      [name, description, price, image_url, stock_quantity, category, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Product not found" });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("❌ Update product error:", error);
    res
      .status(500)
      .json({ error: "Failed to update product", details: error.message });
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

    res.json({
      message: "Product deleted successfully",
      product: result.rows[0],
    });
  } catch (error) {
    console.error("❌ Delete product error:", error);
    res
      .status(500)
      .json({ error: "Failed to delete product", details: error.message });
  }
});

module.exports = router;
