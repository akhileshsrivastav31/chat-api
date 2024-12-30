const { error, success } = require("../handlers");
const Message = require("../models/messageModel");
const Room = require("../models/roomModel");
const { getSocketIo } = require("../helpers/socket");
const io = getSocketIo();

const sendMessage = async (req, res) => {
  try {
    let payload = req.body;
    payload["sender"] = req.user._id;
    const room = await Room.findOne({ _id: payload.roomId });
    if (!room) {
      return error(res, {
        msg: "Please enter valid room id!!",
        error: ["Please enter valid room id!!"],
      });
    }
    payload["seenBy"] = [req.user._id];
    let message = await Message.create(payload);
    message = await getMessageById(message._id);
    // send socket for message
    io.emit(room.roomId, message);
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
    const room = await Room.findOne({ _id: roomId });
    const chats = await Message.find({ roomId })
      .populate("sender", "_id name image")
      .populate("seenBy", "_id name image")
      .sort({ createdAt: 1 });

    return success(res, {
      data: chats,
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
    .populate("seenBy", "_id name image");
  return message;
};

module.exports = {
  sendMessage,
  index,
};
