const { error, success } = require("../handlers");
const Support = require("../models/supportModel");

const support = async (req, res) => {
  try {
    const support = await Support.findOne();
    return success(res, {
      data: support,
      msg: "Support email sent successfully!!",
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

module.exports = { support };
