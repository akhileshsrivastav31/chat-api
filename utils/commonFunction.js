const { default: mongoose } = require("mongoose");
const Room = require("../models/roomModel");

const getRoomInfoByRoomId = async (roomId, userId) => {
  const rooms = await Room.aggregate([
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
        "users.userId": new mongoose.Types.ObjectId(userId),
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
      $lookup: {
        from: "blockedusers",
        localField: "users.userId",
        foreignField: "userId",
        as: "blockedDetails",
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
                {
                  isAdmin: "$$roomUser.isAdmin",
                  isNotificationEnabled: {
                    $ifNull: ["$$roomUser.isNotificationEnabled", true],
                  },
                },
                {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: "$userDetails",
                        as: "userDetail",
                        cond: {
                          $and: [
                            {
                              $eq: ["$$userDetail._id", "$$roomUser.userId"],
                            },
                            {
                              $or: [
                                { $eq: ["$$userDetail.isDeleted", false] }, // isDeleted is false
                                {
                                  $not: {
                                    $ifNull: ["$$userDetail.isDeleted", false],
                                  },
                                }, // isDeleted is undefined or null
                              ],
                            },
                          ],
                        },
                      },
                    },
                    0,
                  ],
                },
                {
                  isBlocked: {
                    $gt: [
                      {
                        $size: {
                          $filter: {
                            input: "$blockedDetails",
                            as: "blockedDetail",
                            cond: {
                              $and: [
                                {
                                  $eq: [
                                    "$$blockedDetail.blockedBy",
                                    new mongoose.Types.ObjectId(userId),
                                  ],
                                },
                                {
                                  $eq: [
                                    "$$blockedDetail.userId",
                                    "$$roomUser.userId",
                                  ],
                                },
                              ],
                            },
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
        unseenMessageCount: {
          $size: {
            $filter: {
              input: "$messages",
              as: "message",
              cond: {
                $not: {
                  $in: [
                    new mongoose.Types.ObjectId(userId),
                    "$$message.seenBy",
                  ],
                },
              },
            },
          },
        },
      },
    },
    {
      $addFields: {
        lastMessageDate: {
          $ifNull: ["$lastMessage.createdAt", "$createdAt"],
        },
      },
    },
    {
      $sort: {
        lastMessageDate: -1,
      },
    },
    {
      $match: {
        _id: new mongoose.Types.ObjectId(roomId),
      },
    },
    {
      $project: {
        messages: 0,
        group: 0,
        userDetails: 0,
        lastMessageDate: 0,
        blockedDetails: 0,
        lastMessage: {
          seenBy: 0,
          sender: 0,
          attachments: 0,
        },
      },
    },
  ]);
  return rooms.length > 0 ? rooms[0] : null;
};

module.exports = {
  getRoomInfoByRoomId,
};
