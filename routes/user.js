const express = require("express");
const { userController } = require("../controllers");
const { verifyToken } = require("../middleware");
const {
  settingValidation,
  blockUnblockValidation,
} = require("../validations/userValidation");
const router = express.Router();

router.post(
  "/setting",
  verifyToken,
  settingValidation,
  userController.addUpdateSetting
);

router.put(
  "/blockUnblock",
  verifyToken,
  blockUnblockValidation,
  userController.blockUnblockUser
);

module.exports = router;
