const express = require("express");
const { verifyToken } = require("../middleware");
const { roomController } = require("../controllers");
const {
  roomValidation,
  messageReadUnreadValidation,
  muteUnmuteValidation,
  deleteChatRoomValidation,
  leaveGroupValidation,
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

router.put(
  "/leaveGroup",
  verifyToken,
  leaveGroupValidation,
  roomController.leaveGroup
);

router.put(
  "/muteUnmuteChatRoom",
  verifyToken,
  muteUnmuteValidation,
  roomController.muteUnmuteChatRoom
);

router.put(
  "/deleteChatRoom",
  verifyToken,
  deleteChatRoomValidation,
  roomController.deleteChatRoom
);

module.exports = router;
