const Joi = require("joi");
const { validate } = require("./validate");

const settingValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
    groupNotificationDisabled: Joi.bool()
      .required()
      .allow(true, false)
      .messages({
        "any.required": "Group Notification Disabled field is required",
      }),
    individualNotificationDisabled: Joi.bool()
      .required()
      .allow(true, false)
      .messages({
        "any.required": "Individual Notification field is required",
      }),
  });
  await validate(req, res, next, schema);
};

const blockUnblockValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
    _id: Joi.string().required().messages({
      "any.required": "User Id field is required",
    }),
    _roomId: Joi.string().optional().allow("", null),
  });
  await validate(req, res, next, schema);
};

module.exports = {
  settingValidation,
  blockUnblockValidation,
};
