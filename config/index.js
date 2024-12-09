const { config } = require("dotenv");
config();
const MONGODB_URI = process.env.MONGODB_URI;
const PORT = process.env.PORT;
const AWS_REGION = process.env.AWS_REGION;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;
const USER_POOL_CLIENT_SECRET = process.env.USER_POOL_CLIENT_SECRET;
const USER_POOL_ID = process.env.USER_POOL_ID;

module.exports = {
  MONGODB_URI,
  PORT,
  AWS_REGION,
  USER_POOL_CLIENT_ID,
  USER_POOL_CLIENT_SECRET,
  USER_POOL_ID,
};
