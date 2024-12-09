const Joi = require("joi");
const { validate } = require("./validate");

const registerUserValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
    name: Joi.string().required().messages({
      "any.required": "Name field is required",
    }),
    countryCode: Joi.number().integer().min(1).max(999).required().messages({
      "any.required": "Country Code field is required",
    }),
    phoneNumber: Joi.number()
      .integer()
      .min(1000000000)
      .max(9999999999)
      .required()
      .messages({
        "any.required": "Phone Number field is required",
      }),
  });
  await validate(req, res, next, schema);
};

module.exports = {
  registerUserValidation,
};
