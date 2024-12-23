const express = require("express");
const { verifyToken } = require("../middleware");
const { homeController } = require("../controllers");
const router = express.Router();

router.get("/search", verifyToken, homeController.search);

module.exports = router;
