const { error, success } = require("../handlers");
const User = require("../models/userModel");

const getUser = async (req, res) => {
  try {
    let response = [];
    if (req.user) {
      response = [req.user];
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
    return success(res, {
      data: [user],
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
};
