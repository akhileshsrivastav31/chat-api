const mongoose = require("mongoose");

const RoomModel = new mongoose.Schema({
  roomId: { type: String, required: true },
  type: { type: String, required: true }, // group or private
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

RoomModel.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Room", RoomModel);
