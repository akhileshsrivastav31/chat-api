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

const addGroup = async (req, res) => {
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
        };
      }) ?? []
    );
    users.push({ roomId: room._id, userId: req.user._id });
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
        },
      },
    ]);

    const response = {
      _id: room._id,
      roomId: room.roomId,
      type: room.type,
      roomName: group.roomName || "",
      roomImage: group.roomImage || "",
      roomDescription: group.roomDescription || "",
      userId: room.userId,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      __v: room.__v,
      users: result,
    };

    console.log(result);
    return success(res, {
      data: [response],
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

module.exports = {
  addGroup,
  index,
};
