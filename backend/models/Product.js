class Product {
  constructor(db) {
    this.db = db;
  }

  async findAll() {
    const [products] = await this.db.query(
      "SELECT * FROM products ORDER BY id"
    );
    return products;
  }

  async findById(id) {
    const [products] = await this.db.query(
      "SELECT * FROM products WHERE id = ?",
      [id]
    );

    return products[0] || null;
  }

  async findByCategory(category) {
    const [products] = await this.db.query(
      "SELECT * FROM products WHERE category = ?",
      [category]
    );

    return products;
  }

  async findDiscounted(limit = 4) {
    const [products] = await this.db.query(
      "SELECT * FROM products WHERE discount > 0 ORDER BY discount DESC LIMIT ?",
      [limit]
    );

    return products;
  }

  async search(keyword) {
    const searchTerm = `%${keyword}%`;
    const [products] = await this.db.query(
      "SELECT * FROM products WHERE name LIKE ? OR category LIKE ? OR description LIKE ?",
      [searchTerm, searchTerm, searchTerm]
    );

    return products;
  }

  async create(productData) {
    const {
      name,
      description,
      price,
      category,
      image_url,
      discount,
      rating,
      stock,
    } = productData;

    const [result] = await this.db.query(
      `INSERT INTO products (name, description, price, category, image_url, discount, rating, stock) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        description,
        price,
        category,
        image_url,
        discount || 0,
        rating || 0,
        stock || 100,
      ]
    );

    return this.findById(result.insertId);
  }

  async update(id, updates) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(id);

    const query = `UPDATE products SET ${fields.join(", ")} WHERE id = ?`;
    await this.db.query(query, values);

    return this.findById(id);
  }

  async updateStock(id, quantityChange) {
    await this.db.query("UPDATE products SET stock = stock + ? WHERE id = ?", [
      quantityChange,
      id,
    ]);

    return this.findById(id);
  }
}

module.exports = Product;
