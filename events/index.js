const User = require("../models/userModel");
const { default: mongoose } = require("mongoose");
const RoomUser = require("../models/roomUser");
const Room = require("../models/roomModel");
const {
  updateReceivedStatus,
  updateMessageStatusByMessageIds,
} = require("./functions");
const { MessageStatus } = require("../enums");

const initEvents = async (io) => {
  // Socket.IO setup
  io.on("connection", async function (socket) {
    console.log(socket.handshake.headers);
    const userId = socket.handshake.headers?.userid;
    // mark online event
    await User.findByIdAndUpdate(userId, { isOnline: true });
    await notifyUser(userId, "online");
    await updateReceivedStatus(userId);

    // trigger typing event
    socket.on("typing", async (data) => {
      await notifyUser(userId, "typing");
    });

    // trigger stop typing event
    socket.on("stopTyping", async (data) => {
      await notifyUser(userId, "stopTyping");
    });

    // trigger message seen event
    socket.on("seenMessages", async (data) => {
      await updateMessageStatusByMessageIds(
        data._id,
        data.messageIds ?? [],
        MessageStatus.SEEN,
        userId
      );
      const room = await Room.findOne({ _id: data._id });
      io.emit(
        room.roomId,
        {
          messageIds: data.messageIds,
          status: MessageStatus.SEEN,
          _id: data._id,
        },
        "messageSeen"
      );
    });
    // trigger disconnect event
    socket.on("disconnect", async (data) => {
      await User.findByIdAndUpdate(userId, {
        isOnline: false,
        lastSeen: Date.now(),
      });
      notifyUser(userId, "offline");
    });
  });
  const notifyUser = async (userId, event) => {
    const user = await User.findOne(
      { _id: userId },
      {
        _id: 1,
        name: 1,
        isOnline: 1,
        lastSeen: 1,
      }
    );
    const rooms = await RoomUser.aggregate([
      {
        $match: {
          userId: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $group: {
          _id: "$roomId",
        },
      },
      {
        $lookup: {
          from: "rooms",
          localField: "_id",
          foreignField: "_id",
          as: "roomDetails",
        },
      },
      {
        $unwind: "$roomDetails",
      },
      {
        $project: {
          _id: 0,
          roomId: "$roomDetails.roomId",
        },
      },
    ]);
    rooms.forEach((room) => {
      io.emit(room.roomId, user, event);
    });
  };
};

module.exports = initEvents;
