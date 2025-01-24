const { error, success } = require("../handlers");
const User = require("../models/userModel");
const UserNotificationTokenModel = require("../models/userNotificationTokenModel");
const UserSetting = require("../models/userSettings");

const getUser = async (req, res) => {
  try {
    let response = {};
    if (req.user) {
      response = req.user.toJSON();
      if (response) {
        response.settings = await UserSetting.findOne({
          userId: req.user?._id,
        });
      }
    }
    return success(res, {
      data: response,
      msg: "User details fetched successfully!!",
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const logout = async (req, res) => {
  try {
    let payload = req.body;
    payload["userId"] = req.user._id;
    await UserNotificationTokenModel.deleteMany({
      userId: req.user._id,
      deviceId: payload.deviceId,
      platform: payload.platform,
    });
    return success(res, {
      data: {},
      msg: "User logout successfully!!",
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const addNotificationToken = async (req, res) => {
  try {
    let payload = req.body;
    payload["userId"] = req.user._id;

    let user = await UserNotificationTokenModel.findOne({
      deviceId: payload.deviceId,
      platform: payload.platform,
      userId: req.user._id,
    });
    if (!user) {
      await UserNotificationTokenModel.create(payload);
      return success(res, {
        data: {},
        msg: "Token added successfully!!",
      });
    }
    await UserNotificationTokenModel.findOneAndUpdate(
      {
        deviceId: payload.deviceId,
        platform: payload.platform,
        userId: req.user._id,
      },
      {
        token: payload.token,
      }
    );
    return success(res, {
      data: {},
      msg: "Token updated successfully!!",
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const registerUser = async (req, res) => {
  try {
    let payload = req.body;
    payload["isAuthenticated"] = true;
    payload["phoneNumber"] = req.cognitoUser?.phone_number;
    if (req.file) {
      payload["image"] = req.file.location;
    }

    let user = await User.findOne({ phoneNumber: payload.phoneNumber });

    payload["isUserProfileCompleted"] = user?.name ? true : false;

    if (!user) {
      payload["authId"] = req.cognitoUser?.sub;
      user = await User.create(payload);
    } else {
      user = await User.findOneAndUpdate(
        { phoneNumber: payload.phoneNumber },
        payload,
        {
          new: true,
        }
      );
    }
    user = user.toJSON();
    user.settings = await UserSetting.findOne({
      userId: user._id,
    });
    if (user.settings == null) {
      user.settings = await UserSetting.create({
        userId: user._id,
        groupNotificationDisabled: false,
        individualNotificationDisabled: false,
      });
    }
    return success(res, {
      data: user,
      msg: "User details fetched successfully!!",
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
  getUser,
  registerUser,
  addNotificationToken,
  logout,
};
