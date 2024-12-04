const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');



// MongoDB connection
mongoose.connect("mongodb+srv://akhileshsiliconstream:Hcl12345@cluster0.wgkk9.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
    , {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'Connection error:'));
db.once('open', () => console.log('Connected to MongoDB'));

// Models
const Message = require('./models/Message');

// Express app setup
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(bodyParser.json());
app.use('/chat', require('./routes/chat'));

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

    // Listen for a "message" event from the client
    socket.on('message', (data) => {
        console.log('Received message:', data);
        // Broadcast the message to all connected clients
        io.emit('message', data);
    });

     socket.on('typing', () => {
        socket.broadcast.emit('typing', socket.id);
    });

    socket.on('stopTyping', () => {
        socket.broadcast.emit('stopTyping', socket.id);
    });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
