const Joi = require("joi");
const { validate } = require("./validate");

const registerUserValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
    name: Joi.string().optional().allow("", null).messages({
      "any.required": "Name field is required",
    }),
    image: Joi.string().optional().allow("", null),
  });
  await validate(req, res, next, schema);
};

const notificationTokenValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
    token: Joi.string().required().messages({
      "any.required": "Name field is required",
    }),
    platform: Joi.string().required().allow("android", "ios"),
  });
  await validate(req, res, next, schema);
};

const logoutValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
    token: Joi.string().required().messages({
      "any.required": "Name field is required",
    }),
  });
  await validate(req, res, next, schema);
};

module.exports = {
  registerUserValidation,
  notificationTokenValidation,
  logoutValidation,
};
