const express = require("express");
const { verifyToken } = require("../middleware");
const { roomController } = require("../controllers");
const {
  roomValidation,
  messageReadUnreadValidation,
} = require("../validations/roomValidation");
const router = express.Router();

router.get("/", verifyToken, roomController.index);
router.get(
  "/getBasicChatroomDetails/:roomId",
  verifyToken,
  roomController.getBasicChatroomDetails
);
router.get("/getCommonGroup/:roomId", verifyToken, roomController.commonGroup);
router.post(
  "/createRoom",
  verifyToken,
  roomValidation,
  roomController.createRoom
);

router.put(
  "/messageReadUnread",
  verifyToken,
  messageReadUnreadValidation,
  roomController.messageReadUnread
);

module.exports = router;
