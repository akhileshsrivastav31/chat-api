const RoomUser = require("../models/roomUser");

const updateRoomUserOpenRoomStatus = async (roomId, userId, isChatOpen) => {
  await RoomUser.findOneAndUpdate(
    { roomId: roomId, userId: userId },
    { isChatOpen }
  );
};
module.exports = {
  updateRoomUserOpenRoomStatus,
};
