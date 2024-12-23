const express = require("express");
const { verifyToken } = require("../middleware");
const { roomController } = require("../controllers");
const { roomValidation } = require("../validations/roomValidation");
const router = express.Router();

router.get("/", verifyToken, roomController.index);
router.post(
  "/createRoom",
  verifyToken,
  roomValidation,
  roomController.createRoom
);

module.exports = router;
