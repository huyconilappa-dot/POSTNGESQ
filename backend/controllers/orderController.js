const orderController = {
  // Create new order
  createOrder: async (req, res) => {
    const {
      userId,
      items,
      totalAmount,
      shippingFee,
      discountAmount,
      paymentMethod,
      shippingAddress,
      couponCode,
    } = req.body;

    if (!userId || !items || !items.length || !totalAmount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const db = req.db;

      // Generate order code
      const orderCode = "MM" + Date.now() + Math.floor(Math.random() * 1000);

      // Start transaction
      await db.query("START TRANSACTION");

      try {
        // Create order
        const [orderResult] = await db.query(
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

        // Insert order items
        for (const item of items) {
          await db.query(
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

        // Commit transaction
        await db.query("COMMIT");

        res.status(201).json({
          message: "Order created successfully",
          orderId,
          orderCode,
        });
      } catch (error) {
        // Rollback on error
        await db.query("ROLLBACK");
        throw error;
      }
    } catch (error) {
      console.error("Create order error:", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  },

  // Get user orders
  getUserOrders: async (req, res) => {
    const userId = req.params.userId;

    try {
      const db = req.db;

      // Get orders with their items
      const [orders] = await db.query(
        `
                SELECT o.*, 
                       GROUP_CONCAT(
                           JSON_OBJECT(
                               'productId', oi.product_id,
                               'name', p.name,
                               'image_url', p.image_url,
                               'quantity', oi.quantity,
                               'unit_price', oi.unit_price,
                               'total_price', oi.total_price
                           )
                       ) as items_json
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE o.user_id = ?
                GROUP BY o.id
                ORDER BY o.created_at DESC
            `,
        [userId]
      );

      // Parse items JSON
      const ordersWithItems = orders.map((order) => {
        const items = order.items_json
          ? JSON.parse(`[${order.items_json}]`)
          : [];
        return {
          ...order,
          items,
        };
      });

      res.json(ordersWithItems);
    } catch (error) {
      console.error("Get user orders error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Get order by ID
  getOrderById: async (req, res) => {
    const orderId = req.params.id;

    try {
      const db = req.db;

      // Get order details
      const [orders] = await db.query(
        `
                SELECT o.*, 
                       GROUP_CONCAT(
                           JSON_OBJECT(
                               'productId', oi.product_id,
                               'name', p.name,
                               'description', p.description,
                               'image_url', p.image_url,
                               'category', p.category,
                               'quantity', oi.quantity,
                               'unit_price', oi.unit_price,
                               'total_price', oi.total_price
                           )
                       ) as items_json
                FROM orders o
                LEFT JOIN order_items oi ON o.id = oi.order_id
                LEFT JOIN products p ON oi.product_id = p.id
                WHERE o.id = ?
                GROUP BY o.id
            `,
        [orderId]
      );

      if (orders.length === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      const order = orders[0];
      const items = order.items_json ? JSON.parse(`[${order.items_json}]`) : [];

      res.json({
        ...order,
        items,
      });
    } catch (error) {
      console.error("Get order error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Update order status
  updateOrderStatus: async (req, res) => {
    const orderId = req.params.id;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const validStatuses = [
      "pending",
      "processing",
      "shipping",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    try {
      const db = req.db;

      const [result] = await db.query(
        "UPDATE orders SET status = ? WHERE id = ?",
        [status, orderId]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Order not found" });
      }

      res.json({ message: "Order status updated successfully" });
    } catch (error) {
      console.error("Update status error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Cancel order
  cancelOrder: async (req, res) => {
    const orderId = req.params.id;

    try {
      const db = req.db;

      // Check if order exists and is pending
      const [orders] = await db.query(
        'SELECT * FROM orders WHERE id = ? AND status = "pending"',
        [orderId]
      );

      if (orders.length === 0) {
        return res.status(400).json({
          error: "Cannot cancel order. Order may not be pending or not found.",
        });
      }

      // Update status to cancelled
      await db.query('UPDATE orders SET status = "cancelled" WHERE id = ?', [
        orderId,
      ]);

      res.json({ message: "Order cancelled successfully" });
    } catch (error) {
      console.error("Cancel order error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },

  // Get all orders (admin)
  getAllOrders: async (req, res) => {
    try {
      const db = req.db;

      const [orders] = await db.query(`
                SELECT o.*, u.email, u.name as user_name 
                FROM orders o
                LEFT JOIN users u ON o.user_id = u.id
                ORDER BY o.created_at DESC
            `);

      res.json(orders);
    } catch (error) {
      console.error("Get all orders error:", error);
      res.status(500).json({ error: "Server error" });
    }
  },
};

module.exports = orderController;
