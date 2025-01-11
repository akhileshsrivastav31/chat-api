const { error, success } = require("../handlers");
const Message = require("../models/messageModel");
const Room = require("../models/roomModel");
const RoomUser = require("../models/roomUser");
const Attachment = require("../models/attachmentModel");
const Group = require("../models/groupModel");
const { getSocketIo } = require("../helpers/socket");
const UserNotificationToken = require("../models/userNotificationTokenModel");
const {
  sendNotificationOnMultipleDeviceTokens,
} = require("../services/firebaseNotification");
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
    payload["attachments"] = [];
    payload["type"] = "text";
    if (req.files?.length > 0) {
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
    let roomUsers = await RoomUser.find(
      { roomId: payload._id, isChatOpen: true, userId: { $ne: req.user._id } },
      { userId: 1 }
    );
    payload["seenBy"] = [req.user._id, ...roomUsers.map((e) => e.userId)];
    payload["roomId"] = payload._id;
    delete payload._id;

    let message = await Message.create(payload);
    message = await getMessageById(message._id);
    // send socket for message
    io.emit(room.roomId, message, "message");
    // send push notification
    let userIds = await RoomUser.aggregate([
      {
        $match: {
          roomId: room._id,
          userId: { $ne: req.user._id },
        },
      },
      {
        $lookup: {
          from: "usersettings",
          localField: "userId",
          foreignField: "userId",
          as: "userSettings",
        },
      },
      {
        $addFields: {
          userSetting: { $arrayElemAt: ["$userSettings", 0] },
        },
      },
      {
        $match: {
          $or: [
            { userSetting: { $exists: false } },
            { "userSetting.notificationDisabled": false },
          ],
        },
      },
      {
        $project: {
          userId: 1,
        },
      },
    ]);

    userIds = userIds.map((doc) => doc.userId);
    const tokens = await UserNotificationToken.find(
      { userId: { $in: userIds } },
      { token: 1, platform: 1 }
    );
    const title = message.sender?.name
      ? message.sender?.name
      : message.sender?.phoneNumber;

    let data = {
      roomId: room._id.toString(),
      page: "chat-detail",
      _id: message.sender._id.toString(),
      type: room.type,
    };
    if (data.type == "group") {
      let group = await Group.findOne({
        roomId: room._id,
      });
      data["roomName"] = group.name;
      data["roomImage"] = group.image;
    } else {
      data["sender_name"] = title;
      data["sender_image"] = message.sender?.image;
    }
    console.log(data);

    if (tokens.length > 0) {
      let androidTokens = tokens
        .filter((t) => t.platform == "android")
        .map((e) => e.token);
      let iosTokens = tokens
        .filter((t) => t.platform == "ios")
        .map((e) => e.token);
      if (androidTokens.length > 0)
        sendNotificationOnMultipleDeviceTokens(
          androidTokens,
          title,
          message.attachments?.length == 0 ? "New Message" : "📷 attachment",
          "android",
          data
        );
      if (iosTokens.length > 0)
        sendNotificationOnMultipleDeviceTokens(
          iosTokens,
          title,
          message.attachments?.length == 0 ? "New Message" : "📷 attachment",
          "ios",
          data
        );
    }

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
    .populate("sender", "_id name image phoneNumber")
    .populate("seenBy", "_id name image")
    .populate("attachments", "_id name url mimeType size");
  return message;
};

const getChatRoomMedia = async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const chatRoomMedia = await Message.aggregate([
      {
        $match: {
          attachments: { $exists: true, $ne: null },
          roomId: new mongoose.Types.ObjectId(roomId),
          $expr: { $gt: [{ $size: "$attachments" }, 0] },
        },
      },
      {
        $lookup: {
          from: "attachments",
          localField: "attachments",
          foreignField: "_id",
          as: "attachmentDetails",
        },
      },
      {
        $unwind: "$attachmentDetails",
      },
      {
        $project: {
          _id: "$attachmentDetails._id",
          messageId: "$_id",
          name: "$attachmentDetails.name",
          url: "$attachmentDetails.url",
          mimeType: "$attachmentDetails.mimeType",
          size: "$attachmentDetails.size",
          createdAt: "$attachmentDetails.createdAt",
        },
      },
    ]);
    return success(res, {
      msg: "Chat room media listed successfully!!",
      data: chatRoomMedia,
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

module.exports = {
  sendMessage,
  index,
  getChatRoomMedia,
};
