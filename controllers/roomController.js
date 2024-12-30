const mongoose = require("mongoose");
const { error, success } = require("../handlers");
const Room = require("../models/roomModel");
const RoomUser = require("../models/roomUser");
const User = require("../models/userModel");
const { v4: uuidv4 } = require("uuid");

const createRoom = async (req, res) => {
  try {
    let user = await User.findOne({
      phoneNumber: req.body.phoneNumber,
    });
    if (user == null) {
      user = await User.create({
        phoneNumber: req.body.phoneNumber,
        isActive: false,
        name: null,
        image: null,
        authId: null,
        isAuthenticated: false,
        isUserProfileCompleted: false,
        countryCode: null,
      });
    }
    const userIds = [req.user._id, user._id];
    const roomAlreadyExists = await RoomUser.aggregate([
      {
        $match: {
          userId: { $in: userIds },
        },
      },
      {
        $group: {
          _id: "$roomId",
          userIds: { $addToSet: "$userId" },
        },
      },
      {
        $match: {
          userIds: { $all: userIds },
        },
      },
      {
        $project: {
          _id: 0,
          roomId: "$_id",
        },
      },
    ]);

    if (roomAlreadyExists.length > 0) {
      let room = await Room.findOne({
        _id: { $in: roomAlreadyExists?.map((e) => e.roomId) },
        type: "private",
      });
      if (room) {
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
          roomName: room.roomName || "",
          roomImage: room.roomImage || "",
          roomDescription: room.roomDescription || "",
          userId: room.userId,
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
          __v: room.__v,
          users: result,
        };
        return success(res, {
          data: response,
          msg: "Room fetched successfully!!",
        });
      }
    }
    const room = await Room.create({
      roomId: uuidv4(),
      type: "private",
      userId: req.user._id,
    });

    const payload = [
      {
        roomId: room._id,
        userId: req.user._id,
      },
      {
        roomId: room._id,
        userId: user._id,
      },
    ];
    await RoomUser.insertMany(payload);
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
      roomName: room.roomName || "",
      roomImage: room.roomImage || "",
      roomDescription: room.roomDescription || "",
      userId: room.userId,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
      __v: room.__v,
      users: result,
    };
    return success(res, {
      data: response,
      msg: "Room created successfully!!",
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const index = async (req, res) => {
  try {
    const rooms = await Room.aggregate([
      // {
      //   $match: {
      //     userId: req.user._id,
      //   },
      // },
      {
        $lookup: {
          from: "groups",
          localField: "_id",
          foreignField: "roomId",
          as: "group",
        },
      },
      {
        $unwind: {
          path: "$group",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          roomName: { $ifNull: ["$group.name", ""] },
          roomImage: { $ifNull: ["$group.image", ""] },
          roomDescription: { $ifNull: ["$group.description", ""] },
        },
      },
      {
        $lookup: {
          from: "roomusers",
          localField: "_id",
          foreignField: "roomId",
          as: "users",
        },
      },
      {
        $match: {
          "users.userId": new mongoose.Types.ObjectId(req.user._id),
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "users.userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $addFields: {
          users: {
            $map: {
              input: "$users",
              as: "roomUser",
              in: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$userDetails",
                      as: "userDetail",
                      cond: { $eq: ["$$userDetail._id", "$$roomUser.userId"] },
                    },
                  },
                  0,
                ],
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "messages",
          localField: "_id",
          foreignField: "roomId",
          as: "messages",
        },
      },
      {
        $addFields: {
          lastMessage: {
            $arrayElemAt: [
              {
                $slice: ["$messages", -1],
              },
              0,
            ],
          },
        },
      },
      {
        $sort: {
          "lastMessage.createdAt": -1,

          createdAt: -1,
        },
      },

      {
        $project: {
          messages: 0,
          group: 0,
          userDetails: 0,
        },
      },
    ]);

    return success(res, {
      data: rooms,
      msg: "Rooms listed successfully!!",
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const getBasicChatroomDetails = async (req, res) => {
  try {
    const room = await Room.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.params.roomId),
        },
      },
      {
        $lookup: {
          from: "groups",
          localField: "_id",
          foreignField: "roomId",
          as: "group",
        },
      },
      {
        $unwind: {
          path: "$group",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          roomName: { $ifNull: ["$group.name", ""] },
          roomImage: { $ifNull: ["$group.image", ""] },
          roomDescription: { $ifNull: ["$group.description", ""] },
        },
      },
      {
        $lookup: {
          from: "roomusers",
          localField: "_id",
          foreignField: "roomId",
          as: "users",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "users.userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $addFields: {
          users: {
            $map: {
              input: "$users",
              as: "roomUser",
              in: {
                $arrayElemAt: [
                  {
                    $filter: {
                      input: "$userDetails",
                      as: "userDetail",
                      cond: { $eq: ["$$userDetail._id", "$$roomUser.userId"] },
                    },
                  },
                  0,
                ],
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "messages",
          localField: "_id",
          foreignField: "roomId",
          as: "messages",
        },
      },
      {
        $addFields: {
          lastMessage: {
            $arrayElemAt: [
              {
                $slice: ["$messages", -1],
              },
              0,
            ],
          },
        },
      },

      {
        $project: {
          messages: 0,
          group: 0,
          userDetails: 0,
        },
      },
    ]);
    if (room.length == 0) {
      return error(res, {
        msg: "No data found",
        error: ["No data found"],
      });
    }

    return success(res, {
      msg: "Room info fetched successfully!!",
      data: room[0],
    });
  } catch (err) {
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

module.exports = {
  createRoom,
  index,
  getBasicChatroomDetails,
};
