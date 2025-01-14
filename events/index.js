const User = require("../models/userModel");
const { default: mongoose } = require("mongoose");
const RoomUser = require("../models/roomUser");
const Room = require("../models/roomModel");
const {
  updateReceivedStatus,
  updateMessageStatusByMessageIds,
  getMessageByIds,
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
      const messages = await getMessageByIds(data.messageIds ?? []);
      let eventsData = {
        [MessageStatus.SEND]: [],
        [MessageStatus.RECEIVED]: [],
        [MessageStatus.SEEN]: [],
      };
      const totalUserCount = await RoomUser.countDocuments({
        roomId: data._id,
      });
      await Promise.all(
        messages.map(async (message) => {
          if (!message.seenBy.includes(userId)) {
            let status = MessageStatus.SEND;
            if (totalUserCount == message.seenBy.length + 1) {
              eventsData[MessageStatus.SEEN].push(message._id);
              status = MessageStatus.SEEN;
            } else {
              eventsData[MessageStatus.SEND].push(message._id);
            }
            await updateMessageStatusByMessageIds(
              data._id,
              [message._id],
              status,
              userId
            );
          }
        })
      );
      const room = await Room.findOne({ _id: data._id });
      Object.keys(eventsData).forEach((event) => {
        if (eventsData[event].length > 0) {
          io.emit(
            room.roomId,
            {
              messageIds: eventsData[event],
              status: parseInt(event),
              _id: data._id,
            },
            "messageSeen"
          );
        }
      });
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
