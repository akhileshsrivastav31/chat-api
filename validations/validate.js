const { error } = require("../handlers");

const validate = async (req, res, next, schema) => {
  try {
    await schema.validateAsync(req.body);
    next();
  } catch (err) {
    return error(res, {
      msg: err.details[0].message,
      error: err.details,
      statuscode: 400,
    });
  }
};

module.exports = {
  validate,
};
