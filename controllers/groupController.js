const mongoose = require("mongoose");
const { success, error } = require("../handlers");
const Group = require("../models/groupModel");
const Room = require("../models/roomModel");
const User = require("../models/userModel");
const RoomUser = require("../models/roomUser");
const { v4: uuidv4 } = require("uuid");

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
          isAdmin: false,
        };
      }) ?? []
    );
    users.push({ roomId: room._id, userId: req.user._id, isAdmin: true });
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
    const group = await Group.findOneAndUpdate(
      {
        roomId: payload.roomId,
      },
      payload,
      {
        new: true,
        runValidators: true,
      }
    );

    let room = await Room.findOne({ _id: group.roomId });
    const response = {
      _id: group._id,
      roomId: group.roomId,
      roomName: group.name || "",
      roomImage: group.image || "",
      roomDescription: group.description || "",
      type: room.type,
      userId: group.userId,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
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
      _id: payload.roomId,
      userId: req.user._id,
    });
    if (!room) {
      return error(res, {
        msg: "No room found!!",
        error: ["No room found!!"],
      });
    }
    let roomUser = await RoomUser.findOne({
      roomId: payload.roomId,
      userId: req.user._id,
    });
    if (!roomUser) {
      return error(res, {
        msg: "No user found!!",
        error: ["No user found!!"],
      });
    }
    const group = await Group.findOne({ roomId: payload.roomId });
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
      roomId: payload.roomId,
      userId: payload.userId,
    });
    roomUser.isAdmin = !roomUser.isAdmin;
    await roomUser.save();
    const result = await RoomUser.aggregate([
      {
        $match: {
          roomId: new mongoose.Types.ObjectId(payload.roomId),
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

module.exports = {
  createGroup,
  index,
  updateGroupDetails,
  toggleAdminFlag,
};
