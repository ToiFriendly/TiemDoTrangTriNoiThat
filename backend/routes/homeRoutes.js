const express = require("express");
const { getHomeData } = require("../controllers/homeController");

const router = express.Router();

router.get("/", getHomeData);

module.exports = router;
