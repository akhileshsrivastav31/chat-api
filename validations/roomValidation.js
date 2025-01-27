const Joi = require("joi");
const { validate } = require("./validate");

const roomValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
    phoneNumber: Joi.string().required(),
  });
  await validate(req, res, next, schema);
};

const messageReadUnreadValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
    _id: Joi.string().required(),
    markAsRead: Joi.bool().required().allow(true, false),
  });
  await validate(req, res, next, schema);
};

const muteUnmuteValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
    _id: Joi.string().required(),
  });
  await validate(req, res, next, schema);
};

const leaveGroupValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
    _id: Joi.string().required(),
  });
  await validate(req, res, next, schema);
};

const deleteChatRoomValidation = async (req, res, next) => {
  const schema = Joi.object().keys({
    _id: Joi.string().required(),
  });
  await validate(req, res, next, schema);
};

module.exports = {
  roomValidation,
  messageReadUnreadValidation,
  muteUnmuteValidation,
  deleteChatRoomValidation,
  leaveGroupValidation,
};
