const express = require("express");
const router = express.Router();

router.use("/auth", require("./auth"));
router.use("/chat", require("./chat"));
router.use("/home", require("./home"));
router.use("/group", require("./group"));
router.use("/rooms", require("./room"));

module.exports = router;
