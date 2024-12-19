const mongoose = require("mongoose");

const UserNotificationTokenModel = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  platform: { type: String, default: "android" },
  token: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

UserNotificationTokenModel.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model(
  "UserNotificationToken",
  UserNotificationTokenModel
);
