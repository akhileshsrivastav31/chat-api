const express = require("express");
const http = require("http");
const cors = require("cors");
const bodyParser = require("body-parser");
const config = require("./config");
const { initializeSocket } = require("./helpers/socket");
const initEvents = require("./events");
const { error } = require("./handlers");
require("./helpers/connectDb");

// Express app setup
const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

app.use(cors());
app.use(bodyParser.json());
app.use("/api/v1/", require("./routes"));

// initialize socket events
initEvents(io);
// middleware for global error handling
app.use((err, req, res, next) => {
  console.error(`[Error]: ${err.message}`);
  return error(res, {
    msg: err.message || "Internal Server Error",
    error: [err.message],
  });
});

// Start server
const PORT = config.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
