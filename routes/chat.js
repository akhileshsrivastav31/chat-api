const express = require("express");
const router = express.Router();
const { chatController } = require("../controllers");
const { verifyToken } = require("../middleware");
const { chatValidation } = require("../validations/chatValidation");
const upload = require("../middleware/multer");

router.post(
  "/send",
  verifyToken,
  upload.array("attachments"),
  chatValidation,
  chatController.sendMessage
);
router.get("/:roomId", verifyToken, chatController.index);
router.get("/media/:roomId", verifyToken, chatController.getChatRoomMedia);

module.exports = router;
