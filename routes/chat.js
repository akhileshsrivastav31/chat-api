const express = require("express");
const router = express.Router();
const { chatController } = require("../controllers");
const { verifyToken } = require("../middleware");
const { chatValidation } = require("../validations/chatValidation");
const upload = require("../middleware/multer");

router.post("/send", verifyToken, chatValidation, chatController.sendMessage);
router.get("/:roomId", verifyToken, chatController.index);

module.exports = router;
