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

module.exports = {
  registerUserValidation,
};
