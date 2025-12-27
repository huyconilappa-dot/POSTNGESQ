const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const authMiddleware = require("../middlewares/authMiddleware");

module.exports = (db) => {
  // Inject db vào request
  router.use((req, res, next) => {
    req.db = db;
    next();
  });

  // Health check
  router.get("/health", (req, res) => {
    res.json({ status: "OK", service: "orders" });
  });

  // Protected routes
  router.post("/", authMiddleware.verifyToken, orderController.createOrder);

  router.get(
    "/user/:userId",
    authMiddleware.verifyToken,
    orderController.getUserOrders
  );

  router.get("/:id", authMiddleware.verifyToken, orderController.getOrderById);

  router.patch(
    "/:id/status",
    authMiddleware.verifyToken,
    orderController.updateOrderStatus
  );

  router.delete(
    "/:id",
    authMiddleware.verifyToken,
    orderController.cancelOrder
  );

  // Admin routes
  router.get(
    "/",
    authMiddleware.verifyToken,
    authMiddleware.isAdmin,
    orderController.getAllOrders
  );

  return router;
};
