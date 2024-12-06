const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");

// MongoDB connection
mongoose.connect(
  "mongodb+srv://akhileshsiliconstream:Hcl12345@cluster0.wgkk9.mongodb.net/sample_mflix?retryWrites=true&w=majority&appName=Cluster0",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "Connection error:"));
db.once("open", () => console.log("Connected to MongoDB"));

// Models
const Message = require("./models/Message");

// Express app setup
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());
app.use(bodyParser.json());
app.use("/chat", require("./routes/chat"));

const itemSchema = new mongoose.Schema(
  { name: String, quantity: String },
  { versionKey: false }
);
// Create a model
// const Item = mongoose.model("ItemSchema", ItemSchema);
const Item = mongoose.model("Item", itemSchema, "ItemSchema"); // 'ItemSchema' is the name of your collection
// Routes
app.get("/getItem", async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});
app.post("/addItem", async (req, res) => {
  const newItem = new Item(req.body);
  await newItem.save();
  res.send(newItem);
});
// app.listen(port, () => {
//   console.log(`Server is running on port ${port}`);
// });
// Socket.IO setup
io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Listen for a "message" event from the client
  socket.on("message", (data) => {
    console.log("Received message:", data);
    // Broadcast the message to all connected clients
    io.emit("message", data);
  });

  socket.on("typing", () => {
    socket.broadcast.emit("typing", socket.id);
  });

  socket.on("stopTyping", () => {
    socket.broadcast.emit("stopTyping", socket.id);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 80;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
