const express = require("express");
const {
  addToCart,
  checkout,
  clearCartItems,
  getCart,
  getOrderDetail,
  handleMomoPaymentResult,
  removeCartItem,
  updateCartItem,
} = require("../controllers/shopController");
const {
  listMyNotifications,
  markNotificationAsRead,
} = require("../controllers/notificationController");
const {
  createCustomerMessage,
  listCustomerMessages,
} = require("../controllers/chatController");
const { authenticateToken } = require("../middlewares/auth");

const router = express.Router();

router.post("/payments/momo/ipn", handleMomoPaymentResult);
router.post("/payments/momo/return", handleMomoPaymentResult);

router.use(authenticateToken);

router.get("/cart", getCart);
router.post("/cart/items", addToCart);
router.patch("/cart/items/:productId", updateCartItem);
router.delete("/cart/items/:productId", removeCartItem);
router.delete("/cart", clearCartItems);
router.post("/checkout", checkout);
router.get("/orders/:orderCode", getOrderDetail);
router.get("/notifications", listMyNotifications);
router.patch("/notifications/:id/read", markNotificationAsRead);
router.get("/chat/messages", listCustomerMessages);
router.post("/chat/messages", createCustomerMessage);

module.exports = router;
