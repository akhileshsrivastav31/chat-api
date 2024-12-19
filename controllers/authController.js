const { error, success } = require("../handlers");
const User = require("../models/userModel");
const UserNotificationTokenModel = require("../models/userNotificationTokenModel");

const getUser = async (req, res) => {
  try {
    let response = {};
    if (req.user) {
      response = req.user;
      response.isUserProfileCompleted = req.user?.name ? true : false;
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
    await UserNotificationTokenModel.deleteOne({
      userId: req.user._id,
      token: payload.token,
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
    await UserNotificationTokenModel.create(payload);
    return success(res, {
      data: {},
      msg: "Token added successfully!!",
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
    payload["phoneNumber"] = req.cognitoUser?.phone_number;
    if (req.file) {
      payload["image"] = req.file.location;
    }
    let user = await User.findOne({ phoneNumber: payload.phoneNumber });
    if (!user) {
      payload["cognitoUserId"] = req.cognitoUser?.sub;
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
    user.isUserProfileCompleted = user?.name ? true : false;
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
