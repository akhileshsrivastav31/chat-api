const mongoose = require("mongoose");
const { success, error } = require("../handlers");
const Group = require("../models/groupModel");
const Room = require("../models/roomModel");
const User = require("../models/userModel");
const RoomUser = require("../models/roomUser");
const { v4: uuidv4 } = require("uuid");

// Helper function to find or create a user by phone number
const findOrCreateUser = async (phoneNumber) => {
  let user = await User.findOne({ phoneNumber });
  if (!user) {
    user = await User.create({
      phoneNumber,
      isActive: false,
      name: null,
      image: null,
      authId: null,
      isAuthenticated: false,
      isUserProfileCompleted: false,
      countryCode: null,
    });
  }
  return user;
};

// Helper function to get users in a room
const getRoomUsers = async (roomId) => {
  return await RoomUser.aggregate([
    {
      $match: { roomId: new mongoose.Types.ObjectId(roomId), isDeleted: false },
    },
    {
      $lookup: {
        from: "users",
        localField: "userId",
        foreignField: "_id",
        as: "userDetails",
      },
    },
    { $unwind: "$userDetails" },
    {
      $project: {
        _id: "$userDetails._id",
        phoneNumber: "$userDetails.phoneNumber",
        name: "$userDetails.name",
        image: "$userDetails.image",
        isActive: "$userDetails.isActive",
        isUserProfileCompleted: "$userDetails.isUserProfileCompleted",
        isAuthenticated: "$userDetails.isAuthenticated",
        authId: "$userDetails.authId",
        countryCode: "$userDetails.countryCode",
      },
    },
  ]);
};

// Index: Get all groups of a user
const index = async (req, res) => {
  try {
    const groups = await Group.find({ userId: req.user._id, isDeleted: false });
    return success(res, { data: groups, msg: "Groups listed successfully!" });
  } catch (err) {
    console.error(err);
    return error(res, { msg: "Something went wrong!", error: [err.message] });
  }
};

// Create Group
const createGroup = async (req, res) => {
  try {
    const { users, ...payload } = req.body;
    const room = await Room.create({
      roomId: uuidv4(),
      userId: req.user._id,
      type: "group",
    });
    const group = await Group.create({
      ...payload,
      roomId: room._id,
      userId: req.user._id,
    });

    const userEntries = await Promise.all(
      (users || []).map(async (phoneNumber) => {
        const user = await findOrCreateUser(phoneNumber);
        return { roomId: room._id, userId: user._id };
      })
    );

    userEntries.push({ roomId: room._id, userId: req.user._id });
    await RoomUser.insertMany(userEntries);

    const updatedUsers = await getRoomUsers(room._id);
    const response = { ...room.toObject(), users: updatedUsers };

    return success(res, { data: response, msg: "Group created successfully!" });
  } catch (err) {
    console.error(err);
    return error(res, { msg: "Something went wrong!", error: [err.message] });
  }
};

// Update Group Details
const updateGroupDetails = async (req, res) => {
  try {
    const payload = req.file
      ? { ...req.body, image: req.file.location }
      : req.body;
    const group = await Group.findOneAndUpdate(
      { roomId: payload.roomId },
      payload,
      { new: true }
    );

    if (!group) {
      return error(res, {
        msg: "Group not found!",
        error: ["Group not found!"],
      });
    }

    return success(res, {
      msg: "Group details updated successfully!",
      data: group,
    });
  } catch (err) {
    console.error(err);
    return error(res, { msg: "Something went wrong!", error: [err.message] });
  }
};

// Add User to Group
// Add multiple users to Group
const addUserInGroup = async (req, res) => {
  try {
    const { roomId, phoneNumber } = req.body;
    if (!roomId || !phoneNumber || phoneNumber.length === 0) {
      return error(res, { msg: "RoomId and PhoneNumbers are required!" });
    }

    // Find the room by roomId
    const room = await Room.findById(roomId);
    if (!room) {
      return error(res, { msg: "Room not found!" });
    }

    // Find or create users by phone numbers
    const userEntries = await Promise.all(
      phoneNumber.map(async (phoneNumber) => {
        let user = await findOrCreateUser(phoneNumber);

        // Check if the user is already a member of the room
        const isMember = await RoomUser.findOne({ roomId, userId: user._id });
        if (isMember) {
          return null; // Skip adding the user if already a member
        }

        return { roomId, userId: user._id };
      })
    );

    // Filter out any null values (users who were already members)
    const validUserEntries = userEntries.filter((entry) => entry !== null);

    // If no valid users to add, return early
    if (validUserEntries.length === 0) {
      return success(res, {
        msg: "All users are already members of the group!",
      });
    }

    // Add users to the room
    await RoomUser.insertMany(validUserEntries);

    // Fetch the updated list of users in the room
    const updatedUsers = await getRoomUsers(roomId);
    const group = await Group.findOne({ roomId });

    const response = {
      ...room.toObject(),
      roomName: group.name || "",
      users: updatedUsers,
    };
    return success(res, {
      msg: "Users added to the group successfully",
      data: response,
    });
  } catch (err) {
    console.error(err);
    return error(res, { msg: "Something went wrong!", error: [err.message] });
  }
};

// Delete User from Group
const deleteUserFromGroup = async (req, res) => {
  try {
    const { roomId, phoneNumber } = req.body;
    if (!roomId || !phoneNumber)
      return error(res, { msg: "RoomId and PhoneNumber are required!" });

    const user = await User.findOne({ phoneNumber });
    if (!user) return error(res, { msg: "User not found!" });

    const roomUser = await RoomUser.findOneAndDelete({
      roomId,
      userId: user._id,
    });
    if (!roomUser)
      return error(res, { msg: "User is not a member of the room!" });

    const updatedUsers = await getRoomUsers(roomId);
    const room = await Room.findById(roomId);
    const group = await Group.findOne({ roomId });

    const response = {
      ...room.toObject(),
      roomName: group.name || "",
      users: updatedUsers,
    };
    return success(res, {
      msg: "User removed from the room successfully!",
      data: response,
    });
  } catch (err) {
    console.error(err);
    return error(res, { msg: "Something went wrong!", error: [err.message] });
  }
};

module.exports = {
  createGroup,
  index,
  updateGroupDetails,
  addUserInGroup,
  deleteUserFromGroup,
};
