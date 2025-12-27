class Order {
  constructor(db) {
    this.db = db;
  }

  async create(orderData) {
    const {
      userId,
      items,
      totalAmount,
      shippingFee,
      discountAmount,
      paymentMethod,
      shippingAddress,
      couponCode,
    } = orderData;

    const orderCode = "MM" + Date.now() + Math.floor(Math.random() * 1000);

    // Start transaction
    await this.db.query("START TRANSACTION");

    try {
      // Create order
      const [orderResult] = await this.db.query(
        `INSERT INTO orders (order_code, user_id, total_amount, shipping_fee, discount_amount, 
                 payment_method, shipping_address, coupon_code) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          orderCode,
          userId,
          totalAmount,
          shippingFee || 0,
          discountAmount || 0,
          paymentMethod || "cod",
          shippingAddress,
          couponCode || null,
        ]
      );

      const orderId = orderResult.insertId;

      // Create order items
      for (const item of items) {
        await this.db.query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price) 
                     VALUES (?, ?, ?, ?, ?)`,
          [
            orderId,
            item.productId,
            item.quantity,
            item.unitPrice,
            item.totalPrice,
          ]
        );
      }

      await this.db.query("COMMIT");

      return this.findById(orderId);
    } catch (error) {
      await this.db.query("ROLLBACK");
      throw error;
    }
  }

  async findById(id) {
    const [orders] = await this.db.query(
      `
            SELECT o.*, 
                   GROUP_CONCAT(
                       JSON_OBJECT(
                           'id', oi.id,
                           'productId', oi.product_id,
                           'quantity', oi.quantity,
                           'unitPrice', oi.unit_price,
                           'totalPrice', oi.total_price
                       )
                   ) as items_json
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.id = ?
            GROUP BY o.id
        `,
      [id]
    );

    if (orders.length === 0) return null;

    const order = orders[0];
    order.items = order.items_json ? JSON.parse(`[${order.items_json}]`) : [];
    delete order.items_json;

    return order;
  }

  async findByUserId(userId) {
    const [orders] = await this.db.query(
      `
            SELECT o.*, 
                   GROUP_CONCAT(
                       JSON_OBJECT(
                           'id', oi.id,
                           'productId', oi.product_id,
                           'quantity', oi.quantity,
                           'unitPrice', oi.unit_price,
                           'totalPrice', oi.total_price
                       )
                   ) as items_json
            FROM orders o
            LEFT JOIN order_items oi ON o.id = oi.order_id
            WHERE o.user_id = ?
            GROUP BY o.id
            ORDER BY o.created_at DESC
        `,
      [userId]
    );

    return orders.map((order) => {
      order.items = order.items_json ? JSON.parse(`[${order.items_json}]`) : [];
      delete order.items_json;
      return order;
    });
  }

  async findByOrderCode(orderCode) {
    const [orders] = await this.db.query(
      "SELECT * FROM orders WHERE order_code = ?",
      [orderCode]
    );

    return orders[0] || null;
  }

  async updateStatus(id, status) {
    await this.db.query("UPDATE orders SET status = ? WHERE id = ?", [
      status,
      id,
    ]);

    return this.findById(id);
  }

  async findAll(filters = {}) {
    let query = `
            SELECT o.*, u.email, u.name as user_name 
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
        `;

    const values = [];
    const conditions = [];

    if (filters.status) {
      conditions.push("o.status = ?");
      values.push(filters.status);
    }

    if (filters.startDate) {
      conditions.push("o.created_at >= ?");
      values.push(filters.startDate);
    }

    if (filters.endDate) {
      conditions.push("o.created_at <= ?");
      values.push(filters.endDate);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY o.created_at DESC";

    const [orders] = await this.db.query(query, values);
    return orders;
  }

  async getOrderWithDetails(id) {
    const [orders] = await this.db.query(
      `
            SELECT o.*, 
                   u.email, u.name as user_name, u.phone,
                   GROUP_CONCAT(
                       JSON_OBJECT(
                           'productId', oi.product_id,
                           'productName', p.name,
                           'description', p.description,
                           'imageUrl', p.image_url,
                           'category', p.category,
                           'quantity', oi.quantity,
                           'unitPrice', oi.unit_price,
                           'totalPrice', oi.total_price
                       )
                   ) as items_json
            FROM orders o
            LEFT JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.id = oi.order_id
            LEFT JOIN products p ON oi.product_id = p.id
            WHERE o.id = ?
            GROUP BY o.id
        `,
      [id]
    );

    if (orders.length === 0) return null;

    const order = orders[0];
    order.items = order.items_json ? JSON.parse(`[${order.items_json}]`) : [];
    delete order.items_json;

    return order;
  }
}

module.exports = Order;
