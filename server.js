const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const config = require("./config");
const { initializeSocket } = require("./helpers/socket");
const User = require("./models/userModel");
const { default: mongoose } = require("mongoose");
const RoomUser = require("./models/roomUser");
require("./helpers/connectDb");

// Express app setup
const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

app.use(cors());
app.use(bodyParser.json());
app.use("/api/v1/", require("./routes"));

// Socket.IO setup
io.on("connection", async function (socket) {
  console.log(socket.handshake.headers);
  const userId = socket.handshake.headers?.userid;
  await User.findByIdAndUpdate(userId, { isOnline: true });
  await notifyUser(userId, "online");
  socket.on("typing", async (data) => {
    await notifyUser(userId, "typing");
  });
  socket.on("stopTyping", async (data) => {
    await notifyUser(userId, "stopTyping");
  });
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

// Start server
const PORT = config.PORT || 3000;
server.listen(PORT, () => {
  // uncomment this to generate token for testing
  // generateToken();
  //registerUser();
  //verifyUser();
  console.log(`Server running on port ${PORT}`);
});
