const Joi = require("joi");
const { validate } = require("./validate");

const chatValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
    _id: Joi.string().required().messages({
      "any.required": "Room Id field is required",
    }),
    message: Joi.string().required(),
    feId: Joi.string().required(),
  });
  await validate(req, res, next, schema);
};

module.exports = {
  chatValidation,
};
