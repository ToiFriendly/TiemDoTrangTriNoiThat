const express = require("express");
const { authenticateToken, authorizeRoles } = require("../middlewares/auth");
const {
  listAdminCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categoryController");
const {
  listAdminProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} = require("../controllers/productController");
const {
  approveOrder,
  listAdminOrders,
} = require("../controllers/orderAdminController");
const {
  createAdminMessage,
  listAdminConversations,
  listAdminMessagesByCustomer,
} = require("../controllers/chatController");

const router = express.Router();

router.use(authenticateToken, authorizeRoles("admin"));

router.get("/categories", listAdminCategories);
router.post("/categories", createCategory);
router.put("/categories/:id", updateCategory);
router.delete("/categories/:id", deleteCategory);

router.get("/products", listAdminProducts);
router.post("/products", createProduct);
router.put("/products/:id", updateProduct);
router.delete("/products/:id", deleteProduct);

router.get("/orders", listAdminOrders);
router.patch("/orders/:id/approve", approveOrder);

router.get("/chat/conversations", listAdminConversations);
router.get("/chat/messages/:customerId", listAdminMessagesByCustomer);
router.post("/chat/messages", createAdminMessage);

module.exports = router;
