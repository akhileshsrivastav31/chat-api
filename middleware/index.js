const config = require("../config");
const { error } = require("../handlers");
const jwt = require("jsonwebtoken");
const User = require("../models/userModel");
const admin = require("../utils/firebase");

const verifyToken = async (req, res, next) => {
  let token = req.headers?.authorization?.split(" ")[1];
  if (!token) {
    return error(res, {
      msg: "Authorization token is required",
      statusCode: 419,
    });
  }
  try {
    const tokenArr = token.split(" ");
    if (tokenArr.length > 1) token = tokenArr[1];
    const user = await admin.auth().verifyIdToken(token);
    const dbUser = await User.findOne({
      authId: user.sub,
    });
    if (!dbUser && !req.baseUrl?.endsWith("/api/v1/auth")) {
      return error(res, {
        msg: "User not found!!",
        statusCode: 404,
      });
    }
    if (dbUser) {
      if (!dbUser.isActive) {
        return error(res, {
          msg: "Your account is inactive. Contact admin to activate your account",
          statusCode: 403,
        });
      }
      if (dbUser?.isDeleted) {
        return error(res, {
          msg: "Your account is deleted.",
          statusCode: 401,
        });
      }
      req.user = dbUser;
    }
    req.cognitoUser = user;
    next();
  } catch (err) {
    console.log(err);
    return error(res, {
      msg: "Invalid token",
      statusCode: 401,
    });
  }
};

module.exports = {
  verifyToken,
};
