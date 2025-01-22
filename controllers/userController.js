const { error, success } = require("../handlers");
const BlockedUser = require("../models/blockedUserModel");
const RoomUser = require("../models/roomUser");
const User = require("../models/userModel");
const UserSetting = require("../models/userSettings");
const firebaseAdmin = require("../utils/firebase");

const addUpdateSetting = async (req, res) => {
  try {
    const payload = req.body;
    let setting = await UserSetting.findOne({
      userId: req.user._id,
    });
    if (payload.allNotificationDisabled) {
      payload["groupNotificationDisabled"] = true;
      payload["individualNotificationDisabled"] = true;
    }
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
    let response = req.user.toJSON();
    response.settings = setting;
    return success(res, {
      msg: "Setting updated successfully!!",
      data: response,
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Unable to update notification settings. Please check your internet connection",
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

const listAllBlockedUsers = async (req, res) => {
  try {
    let { page = 1, limit = 10 } = req.query;
    let blockedUsers = await BlockedUser.find({
      blockedBy: req.user._id,
    })
      .populate("userId", "_id name phoneNumber image")
      .skip((page - 1) * limit)
      .limit(limit);
    const total = await BlockedUser.find({
      blockedBy: req.user._id,
    }).countDocuments();
    return success(res, {
      msg: "Blocked users listed successfully!!",
      data: { total, blockedUsers },
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    await firebaseAdmin.auth().deleteUser(req.user.authId);
    await User.updateOne(
      {
        _id: req.user._id,
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
        phoneNumber: req.user.phoneNumber + "_deleted",
        authId: req.user.authId + "_deleted",
      }
    );
    return success(res, {
      msg: "User deleted successfully!!",
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
  listAllBlockedUsers,
  deleteUser,
};
