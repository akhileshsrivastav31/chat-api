const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Listen for client connections
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

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
