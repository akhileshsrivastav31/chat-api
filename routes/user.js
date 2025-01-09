const express = require("express");
const { userController } = require("../controllers");
const { verifyToken } = require("../middleware");
const { settingValidation } = require("../validations/userValidation");
const router = express.Router();

router.post(
  "/setting",
  verifyToken,
  settingValidation,
  userController.addUpdateSetting
);

module.exports = router;
