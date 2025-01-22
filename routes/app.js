const express = require("express");
const { appController } = require("../controllers");
const router = express.Router();

router.get("/support", appController.support);

module.exports = router;
