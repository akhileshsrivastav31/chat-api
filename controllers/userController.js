const { error, success } = require("../handlers");
const BlockedUser = require("../models/blockedUserModel");
const RoomUser = require("../models/roomUser");
const UserSetting = require("../models/userSettings");

const addUpdateSetting = async (req, res) => {
  try {
    const payload = req.body;
    let setting = await UserSetting.findOne({
      userId: req.user._id,
    });
    if (setting) {
      setting = await UserSetting.findOneAndUpdate(
        {
          userId: req.user._id,
        },
        payload,
        {
          new: true,
        }
      );
    } else {
      payload["userId"] = req.user._id;
      setting = await UserSetting.create(payload);
    }
    return success(res, {
      msg: "Setting updated successfully!!",
      data: setting,
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const blockUnblockUser = async (req, res) => {
  try {
    const payload = req.body;
    if (payload._id == req.user._id) {
      return error(res, {
        msg: "You can't block/unblock yourself!!",
        error: ["You can't block/unblock yourself"],
      });
    }

    let blockedUser = await BlockedUser.findOne({
      blockedBy: req.user._id,
      userId: payload._id,
    });
    let isBlocked = false;
    if (blockedUser) {
      await BlockedUser.deleteOne({
        blockedBy: req.user._id,
        userId: payload._id,
      });
    } else {
      isBlocked = true;
      await BlockedUser.create({
        blockedBy: req.user._id,
        userId: payload._id,
      });
    }
    return success(res, {
      msg: `User ${isBlocked ? "blocked" : "unblocked"} successfully!!`,
      data: {},
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

module.exports = {
  addUpdateSetting,
  blockUnblockUser,
};
