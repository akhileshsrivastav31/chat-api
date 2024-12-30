const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const config = require("./config");
const { initializeSocket } = require("./helpers/socket");
require("./helpers/connectDb");

// Express app setup
const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

app.use(cors());
app.use(bodyParser.json());
app.use("/api/v1/", require("./routes"));

// Socket.IO setup
io.on("connection", function (socket) {
  console.log("Socket connected successfully!!");
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
