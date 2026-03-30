const express = require("express");
const {
  getHomeData,
  getProductDetail,
  getCategoryProducts
} = require("../controllers/homeController");

const router = express.Router();

router.get("/", getHomeData);
router.get("/products/:slug", getProductDetail);
router.get("/categories/:slug", getCategoryProducts);

module.exports = router;
