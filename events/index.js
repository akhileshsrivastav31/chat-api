const User = require("../models/userModel");
const { default: mongoose } = require("mongoose");
const RoomUser = require("../models/roomUser");
const { updateRoomUserOpenRoomStatus } = require("./functions");

const initEvents = async (io) => {
  // Socket.IO setup
  io.on("connection", async function (socket) {
    console.log(socket.handshake.headers);
    const userId = socket.handshake.headers?.userid;
    // mark online event
    await User.findByIdAndUpdate(userId, { isOnline: true });
    await notifyUser(userId, "online");

    // trigger typing event
    socket.on("typing", async (data) => {
      await notifyUser(userId, "typing");
    });
    // trigger open room event
    socket.on("userRoomStatus", async (data) => {
      console.log(data);
      await updateRoomUserOpenRoomStatus(data.roomId, userId, data.isChatOpen);
    });

    // trigger stop typing event
    socket.on("stopTyping", async (data) => {
      await notifyUser(userId, "stopTyping");
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
