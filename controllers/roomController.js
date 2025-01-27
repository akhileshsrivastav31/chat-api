const mongoose = require("mongoose");
const { error, success } = require("../handlers");
const Room = require("../models/roomModel");
const RoomUser = require("../models/roomUser");
const User = require("../models/userModel");
const { v4: uuidv4 } = require("uuid");
const Message = require("../models/messageModel");
const { updateMessageStatusByMessageIds } = require("../events/functions");
const { MessageStatus } = require("../enums");
const { getSocketIo } = require("../helpers/socket");
const { getRoomInfoByRoomId } = require("../utils/commonFunction");
const io = getSocketIo();

const createRoom = async (req, res) => {
  try {
    if (req.body.phoneNumber == req.user.phoneNumber) {
      return error(res, { msg: "You cannot create a room with yourself!" });
    }
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
          $or: [
            {
              isDeleted: { $exists: false },
            },
            {
              isDeleted: false,
            },
          ],
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
        $or: [
          {
            isDeleted: { $exists: false },
          },
          {
            isDeleted: false,
          },
        ],
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
              isOnline: "$userDetails.isOnline",
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
        isAdmin: false,
      },
      {
        roomId: room._id,
        userId: user._id,
        isAdmin: false,
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
        $match: {
          $or: [
            {
              "userDetails.isDeleted": false,
            },
            {
              "userDetails.isDeleted": { $exists: false },
            },
          ],
        },
      },
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
          isOnline: "$userDetails.isOnline",
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
      {
        $match: {
          $or: [
            {
              isDeleted: { $exists: false },
            },
            {
              isDeleted: false,
            },
          ],
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
        $addFields: {
          users: {
            $filter: {
              input: "$users",
              as: "user",
              cond: {
                $or: [
                  { $eq: ["$$user.isDeleted", false] }, // isDeleted is false
                  { $not: { $ifNull: ["$$user.isDeleted", false] } }, // isDeleted is undefined or null
                ],
              },
            },
          },
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
                                      $ifNull: [
                                        "$$userDetail.isDeleted",
                                        false,
                                      ],
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
                                      new mongoose.Types.ObjectId(req.user._id),
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
                      new mongoose.Types.ObjectId(req.user._id),
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
        $addFields: {
          users: {
            $filter: {
              input: "$users",
              as: "user",
              cond: {
                $or: [
                  { $eq: ["$$user.isDeleted", false] }, // isDeleted is false
                  { $not: { $ifNull: ["$$user.isDeleted", false] } }, // isDeleted is undefined or null
                ],
              },
            },
          },
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
                                      $ifNull: [
                                        "$$userDetail.isDeleted",
                                        false,
                                      ],
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
                                      new mongoose.Types.ObjectId(req.user._id),
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
        $project: {
          messages: 0,
          group: 0,
          userDetails: 0,
          blockedDetails: 0,
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
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const commonGroup = async (req, res) => {
  try {
    const roomId = req.params.roomId;
    const roomUsers = await RoomUser.find(
      {
        roomId: roomId,
        $or: [
          {
            isDeleted: { $exists: false },
          },
          {
            isDeleted: false,
          },
        ],
      },
      { userId: 1 }
    );
    const userIds = roomUsers.map((e) => e.userId);

    const room = await Room.findOne({ _id: roomId });
    if (room.type == "group") {
      return error(res, {
        msg: "You can't get common group for group chat!!",
        error: ["You can't get common group for group chat!!"],
      });
    }

    const groups = await Room.aggregate([
      {
        $match: {
          type: "group",
          $or: [
            {
              isDeleted: { $exists: false },
            },
            {
              isDeleted: false,
            },
          ],
        }, // Only include rooms of type "group"
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
        $match: {
          "users.userId": { $all: userIds },
          $or: [
            {
              "users.isDeleted": { $exists: false },
            },
            {
              "users.isDeleted": false,
            },
          ],
        },
      },
      {
        $project: {
          _id: 1,
          roomId: 1,
          roomName: 1,
          roomImage: 1,
          roomDescription: 1,
          type: "group",
        },
      },
    ]);
    return success(res, {
      msg: "Common groups fetched successfully!!",
      data: groups,
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const messageReadUnread = async (req, res) => {
  try {
    const payload = req.body;

    const room = await Room.findOne({ _id: payload._id });

    if (!room) {
      return error(res, {
        msg: "Please provide valid room's _id!!",
        error: [],
      });
    }
    if (payload.markAsRead) {
      let messages = await Message.find({
        roomId: payload._id,
        sender: { $ne: req.user._id },
        seenBy: { $ne: req.user._id },
      });

      let eventsData = {
        [MessageStatus.SEND]: [],
        [MessageStatus.RECEIVED]: [],
        [MessageStatus.SEEN]: [],
      };
      const totalUserCount = await RoomUser.countDocuments({
        roomId: payload._id,
      });
      await Promise.all(
        messages.map(async (message) => {
          if (!message.seenBy.includes(req.user._id)) {
            let status = MessageStatus.SEND;
            if (totalUserCount == message.seenBy.length + 1) {
              eventsData[MessageStatus.SEEN].push(message._id);
              status = MessageStatus.SEEN;
            } else {
              eventsData[MessageStatus.SEND].push(message._id);
            }
            await updateMessageStatusByMessageIds(
              payload._id,
              [message._id],
              status,
              req.user._id
            );
          }
        })
      );
      Object.keys(eventsData).forEach((event) => {
        if (eventsData[event].length > 0) {
          io.emit(
            room.roomId,
            {
              messageIds: eventsData[event],
              status: parseInt(event),
              _id: payload._id,
            },
            "messageSeen"
          );
        }
      });
    } else {
      const lastMessage = await Message.findOne(
        {
          roomId: payload._id,
          sender: { $ne: req.user._id },
        },
        {},
        { sort: { createdAt: -1 } }
      );

      if (lastMessage) {
        await Message.updateOne(
          { _id: lastMessage._id },
          { $pull: { seenBy: req.user._id }, status: MessageStatus.RECEIVED }
        );
      }
    }
    const roomData = await getRoomInfoByRoomId(payload._id, req.user._id);

    return success(res, {
      msg: `Message ${payload.markAsRead ? "read" : "unread"} successfully!!`,
      data: roomData,
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const muteUnmuteChatRoom = async (req, res) => {
  try {
    const payload = req.body;
    const roomUser = await RoomUser.findOne({
      roomId: payload._id,
      userId: req.user._id,
    });
    if (!roomUser) {
      return error(res, {
        msg: "Please provide valid room's _id!!",
        error: [],
      });
    }
    if (
      roomUser.isNotificationEnabled == undefined ||
      roomUser.isNotificationEnabled == null
    ) {
      roomUser.isNotificationEnabled = true;
    }

    await RoomUser.updateOne(
      { roomId: payload._id, userId: req.user._id },
      { $set: { isNotificationEnabled: !roomUser.isNotificationEnabled } }
    );
    const room = await getRoomInfoByRoomId(payload._id, req.user._id);
    return success(res, {
      msg: `Room ${
        roomUser.isNotificationEnabled ? "unmuted" : "muted"
      } successfully!!`,
      data: room,
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const deleteChatRoom = async (req, res) => {
  try {
    const payload = req.body;
    const room = await Room.findOne({
      _id: payload._id,
      $or: [
        {
          isDeleted: { $exists: false },
        },
        {
          isDeleted: false,
        },
      ],
    });
    if (!room) {
      return error(res, {
        msg: "Please provide valid room's _id!!",
        error: [],
      });
    }
    if (room.type == "group") {
      const roomUser = await RoomUser.findOne({
        roomId: payload._id,
        userId: req.user._id,
      });
      if (roomUser.isAdmin == false) {
        return error(res, {
          msg: "You are not admin of this group!!",
          error: [],
        });
      }
    }
    await Room.updateOne(
      { _id: payload._id },
      {
        isDeleted: true,
        deletedAt: new Date(),
      }
    );

    await RoomUser.updateMany(
      {
        roomId: payload._id,
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
      }
    );

    return success(res, {
      msg: "Room deleted successfully!!",
      data: {},
    });
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Something went wrong!!",
      error: [err.message],
    });
  }
};

const leaveGroup = async (req, res) => {
  try {
    const payload = req.body;
    let room = await Room.findOne({
      _id: payload._id,
      $or: [
        {
          isDeleted: { $exists: false },
        },
        {
          isDeleted: false,
        },
      ],
    });
    if (!room) {
      return error(res, {
        msg: "Please provide valid room id or room already deleted!!",
      });
    }
    let roomUser = await RoomUser.findOne({
      userId: req.user._id,
      roomId: payload._id,
      $or: [
        {
          isDeleted: { $exists: false },
        },
        {
          isDeleted: false,
        },
      ],
    });
    if (!roomUser) {
      return error(res, {
        msg: "Please provide valid user id or this user already deleted!!",
      });
    }
    roomUser.isDeleted = true;
    await roomUser.save();

    room = await Room.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(payload._id),
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
        $addFields: {
          users: {
            $filter: {
              input: "$users",
              as: "user",
              cond: {
                $or: [
                  { $eq: ["$$user.isDeleted", false] }, // isDeleted is false
                  { $not: { $ifNull: ["$$user.isDeleted", false] } }, // isDeleted is undefined or null
                ],
              },
            },
          },
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
                                      $ifNull: [
                                        "$$userDetail.isDeleted",
                                        false,
                                      ],
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
                                      new mongoose.Types.ObjectId(req.user._id),
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
        $project: {
          messages: 0,
          group: 0,
          userDetails: 0,
          blockedDetails: 0,
        },
      },
    ]);

    return success(res, {
      msg: "User removed from room successfully!!",
      data: room,
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
  getBasicChatroomDetails,
  commonGroup,
  messageReadUnread,
  muteUnmuteChatRoom,
  deleteChatRoom,
  leaveGroup,
};
