const mongoose = require("mongoose");

const UserModel = new mongoose.Schema({
  name: { type: String, required: false },
  countryCode: { type: String, required: false },
  phoneNumber: { type: String, required: true },
  image: { type: String, required: false },
  authId: { type: String, required: false },
  isActive: { type: Boolean, default: true },
  isDeleted: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  deletedAt: { type: Date, required: false },
  updatedAt: { type: Date, default: Date.now },
  isUserProfileCompleted: { type: Boolean, default: false },
  isAuthenticated: { type: Boolean, default: false },
  isOnline: { type: Boolean, default: false },
  lastSeen: { type: Date, default: Date.now },
});

UserModel.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("User", UserModel);
