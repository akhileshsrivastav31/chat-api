const express = require("express");
const { authController } = require("../controllers");
const { verifyToken } = require("../middleware");
const { registerUserValidation } = require("../validations/authValidation");
const upload = require("../middleware/multer");
const router = express.Router();

router.get("/", verifyToken, authController.getUser);
router.post(
  "/",
  verifyToken,
  upload.single("image"),
  registerUserValidation,
  authController.registerUser
);

module.exports = router;
