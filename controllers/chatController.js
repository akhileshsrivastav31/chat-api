const { error, success } = require("../handlers");
const Message = require("../models/messageModel");
const Room = require("../models/roomModel");
const Attachment = require("../models/attachmentModel");
const { getSocketIo } = require("../helpers/socket");
const io = getSocketIo();

const sendMessage = async (req, res) => {
  try {
    let payload = req.body;
    if (!payload.message && req.files?.length == 0) {
      return error(res, {
        msg: "Please enter message or upload attachment!!",
        error: ["Please enter message or upload attachment!!"],
      });
    }
    payload["sender"] = req.user._id;
    const room = await Room.findOne({ _id: payload._id });
    if (!room) {
      return error(res, {
        msg: "Please enter valid room id!!",
        error: ["Please enter valid room id!!"],
      });
    }
    if (req.files) {
      payload["type"] = "attachment";
      payload["attachments"] = await Promise.all(
        req.files.map(async (file) => {
          let fileData = await Attachment.create({
            url: file.location,
            name: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
          });
          return fileData._id;
        })
      );
    }
    payload["seenBy"] = [req.user._id];
    payload["roomId"] = payload._id;
    delete payload._id;

    let message = await Message.create(payload);
    message = await getMessageById(message._id);
    // send socket for message
    io.emit(room.roomId, message, "message");
    return success(res, {
      data: message,
      msg: "Message sent successfully!!",
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const index = async (req, res) => {
  try {
    const roomId = req.params.roomId;
    let { page = 1, limit = 10 } = req.query;
    let chats = await Message.find({ roomId })
      .populate("sender", "_id name image")
      .populate("seenBy", "_id name image")
      .populate("attachments", "_id name url mimeType size")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await Message.countDocuments({ roomId });
    chats = chats.reverse();

    return success(res, {
      data: { total, chats },
      msg: "Chats fetched successfully!!",
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const getMessageById = async (id) => {
  const message = await Message.findOne({ _id: id })
    .populate("sender", "_id name image")
    .populate("seenBy", "_id name image")
    .populate("attachments", "_id name url mimeType size");
  return message;
};

module.exports = {
  sendMessage,
  index,
};
