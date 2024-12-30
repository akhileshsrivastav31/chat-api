const Joi = require("joi");
const { validate } = require("./validate");

const groupValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
    name: Joi.string().optional().allow("", null),
    image: Joi.string().optional().allow("", null),
    description: Joi.string().optional().allow("", null),
    users: Joi.array().required().messages({
      "any.required": "Users field is required",
    }),
  });
  await validate(req, res, next, schema);
};

const updateGroupValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
    name: Joi.string().optional().allow("", null),

    roomId: Joi.string().required().messages({
      "any.required": "Room Id field is required",
    }),
    image: Joi.string().optional().allow("", null),
    description: Joi.string().optional().allow("", null),
  });
  await validate(req, res, next, schema);
};

module.exports = {
  groupValidation,
  updateGroupValidation,
};
