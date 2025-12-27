const { Pool } = require("pg");
require("dotenv").config();

class Database {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      port: process.env.DB_PORT || 16738, // Port mặc định PostgreSQL
    });
    console.log("Database pool created successfully");

    // Test connection
    this.testConnection();
  }
  catch(error) {
    console.error("Database initialization failed:", error);
    throw error;
  }
  async testConnection() {
    try {
      const connection = await this.pool.getConnection();
      console.log("Database connection test successful");
      connection.release();
    } catch (error) {
      console.error("Database connection test failed:", error);
      throw error;
    }
  }
  async query(sql, params = []) {
    try {
      const result = await this.pool.query(sql, params);
      return result.rows; // PostgreSQL trả về rows trong result.rows
    } catch (error) {
      console.error("Database query error:", error);
      throw error;
    }
  }

  async execute(sql, params = []) {
    try {
      const [result] = await this.pool.execute(sql, params);
      return result;
    } catch (error) {
      console.error("Database execute error:", error);
      throw error;
    }
  }

  async transaction(callback) {
    const connection = await this.pool.getConnection();

    try {
      await connection.beginTransaction();
      const result = await callback(connection);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async close() {
    try {
      await this.pool.end();
      console.log("Database pool closed");
    } catch (error) {
      console.error("Error closing database pool:", error);
    }
  }
}

// Singleton instance
const database = new Database();

module.exports = database;
