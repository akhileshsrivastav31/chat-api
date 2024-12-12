const { error, success } = require("../handlers");
const User = require("../models/userModel");

const getUser = async (req, res) => {
  try {
    return success(res, {
      data: [req.user],
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
    console.log(payload);
    if (payload["phoneNumber"] != req.cognitoUser?.username) {
      return error(res, {
        msg: "Please provide registered phone number!!",
        error: [],
      });
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
