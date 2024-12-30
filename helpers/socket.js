const { Server } = require("socket.io");
let io;
const initializeSocket = function (server) {
  io = new Server(server);
  return io;
};

const getSocketIo = () => {
  if (io) {
    return io;
  }
  throw new Error("Something went wrong!!");
};

module.exports = {
  initializeSocket,
  getSocketIo,
};