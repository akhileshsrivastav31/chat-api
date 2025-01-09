const { error, success } = require("../handlers");
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

module.exports = {
  addUpdateSetting,
};
