const { success, error } = require("../handlers");
const User = require("../models/userModel");

const search = async (req, res) => {
  try {
    let phoneNumber = req.query.phoneNumber;
    let user = await User.findOne(
      {
        phoneNumber,
      },
      { _id: 1, name: 1, phoneNumber: 1, image: 1 }
    );
    console.log(user);
    return success(res, {
      data: user,
      msg: "User searched successfully!!",
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
  search,
};
