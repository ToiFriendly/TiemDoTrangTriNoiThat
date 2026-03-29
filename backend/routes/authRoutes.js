const express = require("express");
const {
  login,
  register,
  getMe,
  getAdminAccess
} = require("../controllers/authController");
const {
  authenticateToken,
  authorizeRoles
} = require("../middlewares/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", authenticateToken, getMe);
router.get("/admin", authenticateToken, authorizeRoles("admin"), getAdminAccess);

module.exports = router;
