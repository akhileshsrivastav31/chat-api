const Joi = require("joi");
const { validate } = require("./validate");

const settingValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
    notificationDisabled: Joi.bool().required().allow(true, false).messages({
      "any.required": "NOtification Disabled field is required",
    }),
  });
  await validate(req, res, next, schema);
};

module.exports = {
  settingValidation,
};
