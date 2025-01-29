const mongoose = require("mongoose");
const { success, error } = require("../handlers");
const Group = require("../models/groupModel");
const Room = require("../models/roomModel");
const User = require("../models/userModel");
const RoomUser = require("../models/roomUser");
const UserNotificationToken = require("../models/userNotificationTokenModel");
const { v4: uuidv4 } = require("uuid");
const {
  sendNotificationOnMultipleDeviceTokens,
} = require("../services/firebaseNotification");

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
      $match: {
        roomId: new mongoose.Types.ObjectId(_id),
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
    payload.users = payload.users.filter((e) => e != req.user.phoneNumber);
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
    let matchQuery = {
      $or: [
        { userSetting: { $exists: false } },
        { "userSetting.groupNotificationDisabled": false },
      ],
    };
    // send push notification
    let userIds = await RoomUser.aggregate([
      {
        $match: {
          roomId: room._id,
          userId: { $ne: req.user._id },
          $and: [
            {
              $or: [
                {
                  isNotificationEnabled: { $exists: false },
                },
                {
                  isNotificationEnabled: true,
                },
              ],
            },
            {
              $or: [
                {
                  isDeleted: { $exists: false },
                },
                {
                  isDeleted: false,
                },
              ],
            },
          ],
        },
      },
      {
        $lookup: {
          from: "usersettings",
          localField: "userId",
          foreignField: "userId",
          as: "userSettings",
        },
      },
      {
        $addFields: {
          userSetting: { $arrayElemAt: ["$userSettings", 0] },
        },
      },
      {
        $match: matchQuery,
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "user",
        },
      },
      {
        $match: {
          $or: [
            {
              "user.isDeleted": { $exists: false },
            },
            {
              "user.isDeleted": false,
            },
          ],
        },
      },
      {
        $project: {
          userId: 1,
        },
      },
    ]);

    userIds = userIds.map((doc) => doc.userId);
    const tokens = await UserNotificationToken.find(
      { userId: { $in: userIds } },
      { token: 1, platform: 1 }
    );
    const title = `${
      req.user.name ? req.user.name : req.user.phoneNumber
    } has created group with you`;

    let data = {
      roomId: room._id.toString(),
      page: "chat-detail",
      _id: req.user._id.toString(),
      type: room.type,
    };
    data["roomName"] = group.name ?? "";
    data["roomImage"] = group.image ?? "";
    let description = "Click to open";

    if (tokens.length > 0) {
      let androidTokens = tokens
        .filter((t) => t.platform == "android")
        .map((e) => e.token);
      let iosTokens = tokens
        .filter((t) => t.platform == "ios")
        .map((e) => e.token);
      if (androidTokens.length > 0)
        sendNotificationOnMultipleDeviceTokens(
          androidTokens,
          title,
          description,
          "android",
          data
        );
      if (iosTokens.length > 0)
        sendNotificationOnMultipleDeviceTokens(
          iosTokens,
          title,
          description,
          "ios",
          data
        );
    }

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

    if (room.type == "group") {
      let matchQuery = {
        $or: [
          { userSetting: { $exists: false } },
          { "userSetting.groupNotificationDisabled": false },
        ],
      };
      // send push notification
      let userIds = await RoomUser.aggregate([
        {
          $match: {
            roomId: room._id,
            $and: [
              {
                userId: { $ne: req.user._id },
              },
              {
                userId: { $in: validUserEntries?.map((e) => e.userId) },
              },
              {
                $or: [
                  {
                    isNotificationEnabled: { $exists: false },
                  },
                  {
                    isNotificationEnabled: true,
                  },
                ],
              },
              {
                $or: [
                  {
                    isDeleted: { $exists: false },
                  },
                  {
                    isDeleted: false,
                  },
                ],
              },
            ],
          },
        },
        {
          $lookup: {
            from: "usersettings",
            localField: "userId",
            foreignField: "userId",
            as: "userSettings",
          },
        },
        {
          $addFields: {
            userSetting: { $arrayElemAt: ["$userSettings", 0] },
          },
        },
        {
          $match: matchQuery,
        },
        {
          $lookup: {
            from: "users",
            localField: "userId",
            foreignField: "_id",
            as: "user",
          },
        },
        {
          $match: {
            $or: [
              {
                "user.isDeleted": { $exists: false },
              },
              {
                "user.isDeleted": false,
              },
            ],
          },
        },
        {
          $project: {
            userId: 1,
          },
        },
      ]);

      userIds = userIds.map((doc) => doc.userId);
      const tokens = await UserNotificationToken.find(
        { userId: { $in: userIds } },
        { token: 1, platform: 1 }
      );
      const title = `${
        req.user.name ? req.user.name : req.user.phoneNumber
      } has added you in a group `;

      let data = {
        roomId: room._id.toString(),
        page: "chat-detail",
        _id: req.user._id.toString(),
        type: room.type,
      };
      data["roomName"] = group.name ?? "";
      data["roomImage"] = group.image ?? "";
      let description = "Click to open";

      if (tokens.length > 0) {
        let androidTokens = tokens
          .filter((t) => t.platform == "android")
          .map((e) => e.token);
        let iosTokens = tokens
          .filter((t) => t.platform == "ios")
          .map((e) => e.token);
        if (androidTokens.length > 0)
          sendNotificationOnMultipleDeviceTokens(
            androidTokens,
            title,
            description,
            "android",
            data
          );
        if (iosTokens.length > 0)
          sendNotificationOnMultipleDeviceTokens(
            iosTokens,
            title,
            description,
            "ios",
            data
          );
      }
    }

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
