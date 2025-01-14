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
      isAdmin: false,
    });
  }
  return user;
};

// Helper function to get users in a room
const getRoomUsers = async (_id) => {
  return await RoomUser.aggregate([
    {
      $match: { roomId: new mongoose.Types.ObjectId(_id), isDeleted: false },
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
        isAdmin: 1,
      },
    },
  ]);
};

const index = async (req, res) => {
  try {
    let groups = await Group.find({ userId: req.user._id, isDeleted: false });
    return success(res, {
      data: groups,
      msg: "Groups listed successfully!!",
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const createGroup = async (req, res) => {
  try {
    let payload = req.body;

    const room = await Room.create({
      roomId: uuidv4(),
      userId: req.user._id,
      type: "group",
    });
    payload.users = [...new Set(payload.users)];
    payload["roomId"] = room._id;
    payload["userId"] = req.user._id;
    let group = await Group.create(payload);
    let users = await Promise.all(
      payload.users?.map(async (e) => {
        let user = await User.findOne({ phoneNumber: e });
        if (user == null) {
          user = await User.create({
            phoneNumber: e,
            isActive: false,
            name: null,
            image: null,
            authId: null,
            isAuthenticated: false,
            isUserProfileCompleted: false,
            countryCode: null,
          });
        }
        return {
          roomId: room._id,
          userId: user._id,
          isAdmin: user._id == req.user._id,
        };
      }) ?? []
    );

    await RoomUser.insertMany(users);
    const result = await RoomUser.aggregate([
      {
        $match: {
          roomId: new mongoose.Types.ObjectId(room._id),
          isDeleted: false,
        },
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
          isActive: "$userDetails.isActive",
          isUserProfileCompleted: "$userDetails.isUserProfileCompleted",
          createdAt: "$userDetails.createdAt",
          updatedAt: "$userDetails.updatedAt",
          __v: "$userDetails.__v",
          image: "$userDetails.image",
          name: "$userDetails.name",
          isAuthenticated: "$userDetails.isAuthenticated",
          authId: "$userDetails.authId",
          countryCode: "$userDetails.countryCode",
          isAdmin: 1,
        },
      },
    ]);

    const response = {
      _id: room._id,
      roomId: room.roomId,
      type: room.type,
      roomName: group.name || "",
      roomImage: group.image || "",
      roomDescription: group.description || "",
      userId: room.userId,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      __v: room.__v,
      users: result,
    };

    console.log(result);
    return success(res, {
      data: response,
      msg: "Group created successfully!!",
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const updateGroupDetails = async (req, res) => {
  try {
    let payload = req.body;
    if (req.file) {
      payload["image"] = req.file.location;
    }
    const roomId = payload._id;
    delete payload._id;
    const group = await Group.findOneAndUpdate(
      {
        roomId: roomId,
      },
      payload,
      {
        new: true,
        runValidators: true,
      }
    );

    let room = await Room.findOne({ _id: group.roomId });
    const response = {
      _id: room._id,
      roomId: room.roomId,
      roomName: group.name || "",
      roomImage: group.image || "",
      roomDescription: group.description || "",
      type: room.type,
      userId: room.userId,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      __v: group.__v,
    };

    if (!group) {
      return error(res, {
        msg: "No data found!!",
        error: ["No data found!!"],
      });
    }
    return success(res, {
      msg: "Group details updated successfully!!",
      data: response,
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const toggleAdminFlag = async (req, res) => {
  try {
    let payload = req.body;
    if (req.user._id == payload.userId) {
      return error(res, {
        msg: "You can't add/remove yourself as admin!!",
        error: ["You can't add/remove yourself as admin!!"],
      });
    }

    let room = await Room.findOne({
      _id: payload._id,
      // userId: req.user._id,
    });
    if (!room) {
      return error(res, {
        msg: "No room found!!",
        error: ["No room found!!"],
      });
    }
    let roomUser = await RoomUser.findOne({
      roomId: payload._id,
      userId: req.user._id,
    });
    if (!roomUser) {
      return error(res, {
        msg: "No user found!!",
        error: ["No user found!!"],
      });
    }
    const group = await Group.findOne({ roomId: payload._id });
    if (!group) {
      return error(res, {
        msg: "You can't make admin in private chat!!",
        error: ["You can't make admin in private chat!!"],
      });
    }
    if (roomUser.isAdmin) {
      return error(res, {
        msg: "Only group admin can make users to admin!!",
        error: ["Only group admin can make users to admin!!"],
      });
    }
    roomUser = await RoomUser.findOne({
      roomId: payload._id,
      userId: payload.userId,
    });
    roomUser.isAdmin = !roomUser.isAdmin;
    await roomUser.save();
    const result = await RoomUser.aggregate([
      {
        $match: {
          roomId: new mongoose.Types.ObjectId(payload._id),
          userId: new mongoose.Types.ObjectId(payload.userId),
          isDeleted: false,
        },
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
          isActive: "$userDetails.isActive",
          isUserProfileCompleted: "$userDetails.isUserProfileCompleted",
          createdAt: "$userDetails.createdAt",
          updatedAt: "$userDetails.updatedAt",
          __v: "$userDetails.__v",
          image: "$userDetails.image",
          name: "$userDetails.name",
          isAuthenticated: "$userDetails.isAuthenticated",
          authId: "$userDetails.authId",
          countryCode: "$userDetails.countryCode",
          isAdmin: 1,
        },
      },
    ]);
    return success(res, {
      msg: "User updated successfully!!",
      data: result[0],
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const addUserInGroup = async (req, res) => {
  try {
    const { _id, phoneNumber } = req.body;

    if (!_id || !phoneNumber || phoneNumber.length === 0) {
      return error(res, { msg: "RoomId and PhoneNumbers are required!" });
    }

    // Find the room by roomId
    const room = await Room.findById(_id);
    if (!room) {
      return error(res, { msg: "Room not found!" });
    }

    // Find or create users by phone numbers and filter non-members
    const userEntries = await Promise.all(
      phoneNumber.map(async (phone) => {
        const user = await findOrCreateUser(phone);
        const isMember = await RoomUser.exists({
          roomId: _id,
          userId: user._id,
        });
        return isMember
          ? null
          : { roomId: _id, userId: user._id, isAdmin: false };
      })
    );

    const validUserEntries = userEntries.filter(Boolean);

    if (validUserEntries.length === 0) {
      return success(res, {
        msg: "All users are already members of the group!",
      });
    }

    // Add users to the room
    await RoomUser.insertMany(validUserEntries);

    // Fetch the updated list of users in the room
    const [updatedUsers, group] = await Promise.all([
      getRoomUsers(_id),
      Group.findOne({ roomId: _id }),
    ]);

    const response = {
      ...room.toObject(),
      roomName: group?.name || "",
      roomDescription: group?.description || "",
      roomImage: group?.image || "",
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

module.exports = {
  createGroup,
  index,
  updateGroupDetails,
  toggleAdminFlag,
  addUserInGroup,
};
