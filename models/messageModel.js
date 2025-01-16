const mongoose = require("mongoose");
const { MessageStatus } = require("../enums");

const MessageModel = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: false, default: null },
  feId: { type: String, required: true },
  type: { type: String, default: "text" },
  seenBy: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false },
  ],
  attachments: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Attachment",
      required: false,
    },
  ],
  status: { type: Number, default: MessageStatus.SEND }, // 1 means
  isDeleted: { type: Boolean, default: false },
  sentInBlockMode: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", MessageModel);
