const Joi = require("joi");
const { validate } = require("./validate");

const groupValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
    name: Joi.string().required().messages({
      "any.required": "Name field is required",
    }),
  });
  await validate(req, res, next, schema);
};

module.exports = {
  groupValidation,
};
