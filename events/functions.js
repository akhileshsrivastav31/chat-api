const { MessageStatus } = require("../enums");
const Message = require("../models/messageModel");
const RoomUser = require("../models/roomUser");

const updateReceivedStatus = async (userId) => {
  let roomIds = await RoomUser.find({
    userId,
  }).lean();
  roomIds = roomIds.map((e) => e.roomId);
  await Message.updateMany(
    {
      roomId: { $in: roomIds },
      $or: [
        {
          status: MessageStatus.SEND,
        },
        {
          status: { $exists: false },
        },
      ],
    },
    {
      status: MessageStatus.RECEIVED,
    }
  );
};

const updateMessageStatusByMessageIds = async (
  roomId,
  messageIds,
  status,
  userId
) => {
  await Message.updateMany(
    {
      _id: { $in: messageIds },
      roomId,
    },
    {
      status,
      $addToSet: { seenBy: userId },
    }
  );
};

module.exports = { updateReceivedStatus, updateMessageStatusByMessageIds };
