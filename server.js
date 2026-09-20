const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const RoomManager = require('./roomManager');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

const fs = require('fs');
const publicDir = fs.existsSync(path.join(__dirname, 'public', 'index.html'))
  ? path.join(__dirname, 'public')
  : __dirname;

app.use(express.static(publicDir));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', name: 'ARTSCREW - draw and guess', time: new Date() });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const roomManager = new RoomManager(io);

io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // Quick Play Public Matchmaking
  socket.on('room:quickplay', ({ playerData }, callback) => {
    try {
      const result = roomManager.quickPlay(socket, playerData);
      if (callback) callback(result);
    } catch (err) {
      console.error('Error in quickplay:', err);
      if (callback) callback({ success: false, message: 'Server error matching game.' });
    }
  });

  // Create Room
  socket.on('room:create', ({ playerData, settings }, callback) => {
    try {
      const result = roomManager.createRoom(socket, playerData, settings);
      if (callback) callback(result);
    } catch (err) {
      console.error('Error creating room:', err);
      if (callback) callback({ success: false, message: 'Server error creating room.' });
    }
  });

  socket.on('room:join', ({ roomId, playerData }, callback) => {
    try {
      const result = roomManager.joinRoom(socket, roomId, playerData);
      if (callback) callback(result);
    } catch (err) {
      console.error('Error joining room:', err);
      if (callback) callback({ success: false, message: 'Server error joining room.' });
    }
  });

  socket.on('game:start', () => {
    roomManager.startGame(socket);
  });

  socket.on('word:selected', (word) => {
    roomManager.selectWord(socket, word);
  });

  socket.on('draw:action', (drawData) => {
    roomManager.handleDrawAction(socket, drawData);
  });

  socket.on('reaction:send', (emoji) => {
    roomManager.handleEmojiReaction(socket, emoji);
  });

  socket.on('rate:drawing', (stars) => {
    roomManager.handleDrawingRating(socket, stars);
  });

  socket.on('chat:message', (text) => {
    roomManager.handleChat(socket, text);
  });

  socket.on('game:restart', () => {
    roomManager.restartGame(socket);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket Disconnected] ID: ${socket.id}`);
    roomManager.leaveRoom(socket);
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🎨 ARTSCREW - draw and guess Server Running!`);
  console.log(`👉 Play Live: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
