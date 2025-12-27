class User {
  constructor(db) {
    this.db = db;
  }

  async create(userData) {
    const { email, password, name, phone } = userData;

    const [result] = await this.db.query(
      "INSERT INTO users (email, password, name, phone) VALUES (?, ?, ?, ?)",
      [email, password, name, phone]
    );

    return {
      id: result.insertId,
      email,
      name,
      phone,
    };
  }

  async findByEmail(email) {
    const [users] = await this.db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    return users[0] || null;
  }

  async findById(id) {
    const [users] = await this.db.query(
      "SELECT id, email, name, phone, created_at FROM users WHERE id = ?",
      [id]
    );

    return users[0] || null;
  }

  async update(id, updates) {
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      fields.push(`${key} = ?`);
      values.push(value);
    }
    values.push(id);

    const query = `UPDATE users SET ${fields.join(", ")} WHERE id = ?`;
    await this.db.query(query, values);

    return this.findById(id);
  }
}

module.exports = User;
