const express = require("express");
const { verifyToken } = require("../middleware");
const { groupController } = require("../controllers");
const {
  groupValidation,
  updateGroupValidation,
} = require("../validations/groupValidation");
const upload = require("../middleware/multer");
const router = express.Router();

router.get("/", verifyToken, groupController.index);
router.post(
  "/createGroup",
  verifyToken,
  groupValidation,
  groupController.createGroup
);
router.put(
  "/updateGroupDetails",
  verifyToken,
  upload.single("image"),
  updateGroupValidation,
  groupController.updateGroupDetails
);

router.post("/addUserInGroup", verifyToken, groupController.addUserInGroup);
router.post(
  "/deleteUserFromGroup",
  verifyToken,
  groupController.deleteUserFromGroup
);

module.exports = router;
