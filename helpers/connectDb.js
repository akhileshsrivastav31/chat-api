const mongoose = require("mongoose");
const config = require("../config");

// MongoDB connection
mongoose.connect(config.MONGODB_URI, {
  // useNewUrlParser: true,
  // useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error:"));
db.once("open", () => console.log("Connected to MongoDB"));

module.exports = db;
