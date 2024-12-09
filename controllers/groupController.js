const { success, error } = require("../handlers");
const Group = require("../models/groupModel");
const Room = require("../models/roomModel");
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
    let group = await Group.findOne({ name: payload.name });
    if (group) {
      return error(res, {
        msg: "Group name already exists!!",
        error: [],
      });
    }
    const room = await Room.create({
      roomId: uuidv4(),
    });
    payload["roomId"] = room._id;
    payload["userId"] = req.user._id;
    group = await Group.create(payload);
    return success(res, {
      data: [group],
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
