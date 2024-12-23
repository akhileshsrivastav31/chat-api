const { error, success } = require("../handlers");
const Room = require("../models/roomModel");
const RoomUser = require("../models/roomUser");
const User = require("../models/userModel");
const { v4: uuidv4 } = require("uuid");

const createRoom = async (req, res) => {
  try {
    const room = await Room.create({
      roomId: uuidv4(),
      type: "private",
      userId: req.user._id,
    });
    let user = await User.findOne({
      phoneNumber: req.body.phoneNumber,
    });
    const payload = [
      {
        roomId: room._id,
        userId: req.user._id,
        phoneNumber: null,
      },
      {
        roomId: room._id,
        userId: user ? user?._id : null,
        phoneNumber: user == null ? req.body.phoneNumber : null,
      },
    ];
    await RoomUser.insertMany(payload);
    return success(res, {
      data: [room],
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
    console.log(req.user);
    const rooms = await Room.aggregate([
      {
        $match: {
          userId: req.user._id,
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
                $mergeObjects: [
                  "$$roomUser",
                  {
                    userInfo: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: "$userDetails",
                            as: "userDetail",
                            cond: {
                              $eq: ["$$userDetail._id", "$$roomUser.userId"],
                            },
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          },
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

module.exports = {
  createRoom,
  index,
};
