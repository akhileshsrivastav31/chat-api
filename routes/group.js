const express = require("express");
const { verifyToken } = require("../middleware");
const { groupController } = require("../controllers");
const { groupValidation } = require("../validations/groupValidation");
const router = express.Router();

router.get("/", verifyToken, groupController.index);
router.post(
  "/createGroup",
  verifyToken,
  groupValidation,
  groupController.createGroup
);

module.exports = router;
