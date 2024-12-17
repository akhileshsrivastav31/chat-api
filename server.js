const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const cors = require("cors");
const bodyParser = require("body-parser");
const config = require("./config");
const {
  generateToken,
  registerUser,
  verifyUser,
} = require("./services/cognitoService");
require("./helpers/connectDb");

// Express app setup
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(bodyParser.json());
app.use("/api", require("./routes"));

// Socket.IO setup
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Listen for a "message" event from the client
  socket.on("message", (data) => {
    console.log("Received message:", data);
    // Broadcast the message to all connected clients
    io.emit("message", data);
  });

  socket.on("typing", () => {
    socket.broadcast.emit("typing", socket.id);
  });

  socket.on("stopTyping", () => {
    socket.broadcast.emit("stopTyping", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start server
const PORT = config.PORT || 3000;
server.listen(PORT, () => {
  // uncomment this to generate token for testing
  // generateToken();
  //registerUser();
  //verifyUser();
  console.log(`Server running on port ${PORT}`);
});
