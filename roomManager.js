const wordManager = require('./words');

class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map();
    this.playerRoomMap = new Map(); // socketId -> roomId
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    do {
      code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
    } while (this.rooms.has(code));
    return code;
  }

  createRoom(socket, playerData, customSettings = {}) {
    const roomId = this.generateRoomCode();
    const settings = {
      rounds: parseInt(customSettings.rounds, 10) || 3,
      drawTime: parseInt(customSettings.drawTime, 10) || 75,
      difficulty: customSettings.difficulty || 'dynamic',
      customWords: Array.isArray(customSettings.customWords) ? customSettings.customWords : []
    };

    const room = {
      id: roomId,
      isPublic: customSettings.isPublic || false,
      hostId: socket.id,
      state: 'LOBBY',
      settings,
      players: [],
      currentRound: 1,
      drawerIndex: -1,
      currentWord: '',
      currentCategory: 'General',
      currentDifficulty: 'easy',
      wordChoices: [],
      hints: [],
      timer: 0,
      maxTimer: 75,
      timerInterval: null,
      drawingHistory: [],
      wordsUsed: new Set(),
      roundRatings: []
    };

    this.rooms.set(roomId, room);
    return this.joinRoom(socket, roomId, playerData);
  }

  quickPlay(socket, playerData) {
    let targetRoom = null;
    for (const room of this.rooms.values()) {
      if (room.isPublic && room.players.length < 10 && (room.state === 'LOBBY' || room.state === 'DRAWING' || room.state === 'SELECTING_WORD')) {
        targetRoom = room;
        break;
      }
    }

    if (targetRoom) {
      return this.joinRoom(socket, targetRoom.id, playerData);
    } else {
      return this.createRoom(socket, playerData, { isPublic: true, rounds: 3, drawTime: 75, difficulty: 'dynamic' });
    }
  }

  joinRoom(socket, roomId, playerData) {
    roomId = roomId.toUpperCase().trim();
    const room = this.rooms.get(roomId);
    if (!room) {
      return { success: false, message: 'Room not found. Please check the 4-letter code.' };
    }

    if (room.state !== 'LOBBY' && room.state !== 'SELECTING_WORD' && room.state !== 'DRAWING') {
      return { success: false, message: 'Game has already finished in this room.' };
    }

    if (room.players.length >= 12) {
      return { success: false, message: 'Room is full (max 12 players).' };
    }

    this.leaveRoom(socket);

    const player = {
      id: socket.id,
      name: (playerData.name || 'Artist').trim().substring(0, 16) || 'Artist',
      avatar: playerData.avatar || { color: '#4361ee', eyes: '👀', mouth: '👄' },
      score: 0,
      roundScore: 0,
      streak: 0,
      guessedThisRound: false,
      isHost: room.players.length === 0 || room.hostId === socket.id
    };

    room.players.push(player);
    this.playerRoomMap.set(socket.id, roomId);
    socket.join(roomId);

    socket.emit('room:joined', {
      room: this.sanitizeRoom(room),
      player,
      drawingHistory: room.drawingHistory,
      gameState: room.state
    });

    this.broadcastRoomUpdate(room);
    this.sendSystemMessage(room, `${player.name} joined the room!`);

    // Auto-start public room when 2 or more players join
    if (room.isPublic && room.players.length >= 2 && room.state === 'LOBBY' && !room.autoStartTimeout) {
      this.sendSystemMessage(room, '🎮 Match found! Starting in 3 seconds...');
      room.autoStartTimeout = setTimeout(() => {
        room.autoStartTimeout = null;
        if (room.state === 'LOBBY' && room.players.length >= 2) {
          const hostPlayer = room.players.find(p => p.isHost) || room.players[0];
          const fakeSocket = { id: hostPlayer.id, emit: () => {} };
          this.startGame(fakeSocket);
        }
      }, 3000);
    }

    return { success: true, roomId };
  }

  leaveRoom(socket) {
    const roomId = this.playerRoomMap.get(socket.id);
    if (!roomId) return;

    const room = this.rooms.get(roomId);
    this.playerRoomMap.delete(socket.id);
    socket.leave(roomId);

    if (!room) return;

    const leavingIndex = room.players.findIndex(p => p.id === socket.id);
    if (leavingIndex === -1) return;

    const leavingPlayer = room.players[leavingIndex];
    room.players.splice(leavingIndex, 1);

    this.sendSystemMessage(room, `${leavingPlayer.name} left the room.`);

    if (room.players.length === 0) {
      this.clearRoomTimers(room);
      this.rooms.delete(roomId);
      return;
    }

    if (leavingPlayer.isHost && room.players.length > 0) {
      room.players[0].isHost = true;
      room.hostId = room.players[0].id;
      this.sendSystemMessage(room, `👑 ${room.players[0].name} is now the host.`);
    }

    if (room.state === 'DRAWING' || room.state === 'SELECTING_WORD') {
      const currentDrawer = room.players[room.drawerIndex];
      if (!currentDrawer || currentDrawer.id === socket.id) {
        this.sendSystemMessage(room, 'The drawer disconnected! Starting next turn...');
        this.clearRoomTimers(room);
        this.nextTurn(room);
        return;
      }
    }

    this.broadcastRoomUpdate(room);
  }

  startGame(socket) {
    const roomId = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) {
      socket.emit('error:msg', 'Only the host can start the game.');
      return;
    }

    if (room.players.length < 2) {
      socket.emit('error:msg', 'At least 2 players are required to start!');
      return;
    }

    room.players.forEach(p => {
      p.score = 0;
      p.roundScore = 0;
      p.streak = 0;
      p.guessedThisRound = false;
    });

    room.currentRound = 1;
    room.drawerIndex = -1;
    room.wordsUsed.clear();

    this.sendSystemMessage(room, '🚀 ARTSCREW Game Started! Round 1 (Basic Words)');
    this.nextTurn(room);
  }

  nextTurn(room) {
    this.clearRoomTimers(room);
    room.drawingHistory = [];
    room.roundRatings = [];
    room.players.forEach(p => {
      p.guessedThisRound = false;
      p.roundScore = 0;
    });

    room.drawerIndex++;
    if (room.drawerIndex >= room.players.length) {
      room.drawerIndex = 0;
      room.currentRound++;
    }

    if (room.currentRound > room.settings.rounds) {
      this.endGame(room);
      return;
    }

    const drawer = room.players[room.drawerIndex];
    if (!drawer) {
      this.endGame(room);
      return;
    }

    room.state = 'SELECTING_WORD';

    // Fetch 3 progressive words with categories
    const wordData = wordManager.getWordChoices(
      room.settings.difficulty,
      room.currentRound,
      room.wordsUsed,
      room.settings.customWords
    );

    room.wordChoices = wordData.choices;
    room.wordCategories = wordData.categories;
    room.currentDifficulty = wordData.difficulty;
    room.currentWord = '';
    room.hints = [];

    this.broadcastRoomUpdate(room);

    // Send word choices with category labels to drawer
    this.io.to(drawer.id).emit('turn:choose_word', {
      choices: room.wordChoices,
      categories: room.wordCategories,
      difficulty: room.currentDifficulty,
      round: room.currentRound,
      timeLimit: 15
    });

    // Notify guessers
    room.players.forEach(p => {
      if (p.id !== drawer.id) {
        this.io.to(p.id).emit('turn:waiting_for_drawer', {
          drawerName: drawer.name,
          difficulty: room.currentDifficulty,
          round: room.currentRound
        });
      }
    });

    // 15 seconds to choose
    let pickTime = 15;
    room.timer = pickTime;
    room.timerInterval = setInterval(() => {
      pickTime--;
      room.timer = pickTime;
      this.io.to(room.id).emit('timer:update', { timer: pickTime, maxTime: 15 });

      if (pickTime <= 0) {
        this.clearRoomTimers(room);
        const autoWord = room.wordChoices[0] || 'sun';
        this.startDrawingTurn(room, autoWord);
      }
    }, 1000);
  }

  selectWord(socket, chosenWord) {
    const roomId = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(roomId);
    if (!room || room.state !== 'SELECTING_WORD') return;

    const drawer = room.players[room.drawerIndex];
    if (!drawer || drawer.id !== socket.id) return;

    this.clearRoomTimers(room);
    this.startDrawingTurn(room, chosenWord);
  }

  startDrawingTurn(room, word) {
    room.currentWord = word.trim().toLowerCase();
    room.currentCategory = wordManager.getCategoryForWord(room.currentWord);
    room.wordsUsed.add(room.currentWord);
    room.state = 'DRAWING';
    room.drawingHistory = [];

    const drawer = room.players[room.drawerIndex];
    const drawTime = wordManager.getTimerForDifficulty(room.currentDifficulty, room.settings.drawTime);
    room.timer = drawTime;
    room.maxTimer = drawTime;

    // Hints
    room.hints = room.currentWord.split('').map(char => (char === ' ' ? ' ' : '_'));

    // Drawer info
    this.io.to(drawer.id).emit('turn:draw_start', {
      word: room.currentWord,
      category: room.currentCategory,
      drawTime,
      difficulty: room.currentDifficulty,
      isDrawer: true
    });

    // Guesser info (Includes Category Clue!)
    room.players.forEach(p => {
      if (p.id !== drawer.id) {
        this.io.to(p.id).emit('turn:draw_start', {
          hints: room.hints.join(''),
          category: room.currentCategory,
          wordLength: room.currentWord.length,
          drawTime,
          difficulty: room.currentDifficulty,
          drawerName: drawer.name,
          isDrawer: false
        });
      }
    });

    this.broadcastRoomUpdate(room);

    // Hints schedule
    const hintTimes = [];
    if (room.currentDifficulty === 'easy') {
      hintTimes.push(Math.floor(drawTime * 0.7), Math.floor(drawTime * 0.45), Math.floor(drawTime * 0.25));
    } else if (room.currentDifficulty === 'medium') {
      hintTimes.push(Math.floor(drawTime * 0.55), Math.floor(drawTime * 0.25));
    } else if (room.currentDifficulty === 'hard') {
      hintTimes.push(Math.floor(drawTime * 0.35));
    }

    room.timerInterval = setInterval(() => {
      room.timer--;
      this.io.to(room.id).emit('timer:update', { timer: room.timer, maxTime: drawTime });

      if (hintTimes.includes(room.timer)) {
        this.revealRandomHint(room);
      }

      if (room.timer <= 0) {
        this.clearRoomTimers(room);
        this.endTurn(room, "Time's up!");
      }
    }, 1000);
  }

  revealRandomHint(room) {
    const unrevealed = [];
    for (let i = 0; i < room.currentWord.length; i++) {
      if (room.hints[i] === '_' && room.currentWord[i] !== ' ') {
        unrevealed.push(i);
      }
    }

    if (unrevealed.length > 1) {
      const randIdx = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      room.hints[randIdx] = room.currentWord[randIdx];

      const drawer = room.players[room.drawerIndex];
      room.players.forEach(p => {
        if (p.id !== drawer.id && !p.guessedThisRound) {
          this.io.to(p.id).emit('hint:update', { hints: room.hints.join('') });
        }
      });
    }
  }

  handleDrawAction(socket, drawData) {
    const roomId = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(roomId);
    if (!room || room.state !== 'DRAWING') return;

    const drawer = room.players[room.drawerIndex];
    if (!drawer || drawer.id !== socket.id) return;

    if (drawData.type === 'clear') {
      room.drawingHistory = [];
    } else {
      room.drawingHistory.push(drawData);
      if (room.drawingHistory.length > 4000) {
        room.drawingHistory.shift();
      }
    }

    this.io.to(room.id).emit('draw:action', {
      ...drawData,
      senderId: socket.id
    });
  }

  handleEmojiReaction(socket, emoji) {
    const roomId = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    this.io.to(room.id).emit('reaction:bubble', {
      emoji,
      senderName: player.name,
      senderId: player.id
    });
  }

  handleDrawingRating(socket, stars) {
    const roomId = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(roomId);
    if (!room || room.state !== 'ROUND_OVER') return;

    const drawer = room.players[room.drawerIndex];
    if (!drawer || drawer.id === socket.id) return;

    const numStars = Math.min(5, Math.max(1, parseInt(stars, 10) || 5));
    room.roundRatings.push(numStars);

    // Award drawer bonus for high ratings
    drawer.score += numStars * 10;

    const avgRating = (room.roundRatings.reduce((a, b) => a + b, 0) / room.roundRatings.length).toFixed(1);
    this.io.to(room.id).emit('rating:updated', {
      avgRating,
      totalRatings: room.roundRatings.length
    });
  }

  handleChat(socket, messageText) {
    const roomId = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player) return;

    const text = messageText.trim();
    if (!text) return;

    const drawer = room.players[room.drawerIndex];
    const isDrawer = drawer && drawer.id === socket.id;

    if (room.state === 'DRAWING') {
      const cleanGuess = text.toLowerCase();
      const cleanWord = room.currentWord.toLowerCase();

      if (isDrawer) {
        if (cleanGuess.includes(cleanWord)) {
          socket.emit('chat:warning', "You are drawing! Don't write the word in chat.");
          return;
        }
      }

      if (player.guessedThisRound) {
        socket.emit('chat:warning', "You already guessed the word!");
        return;
      }

      // Exact Match!
      if (!isDrawer && cleanGuess === cleanWord) {
        player.guessedThisRound = true;
        player.streak = (player.streak || 0) + 1;

        const timeRatio = room.timer / room.maxTimer;
        let points = Math.round(150 + timeRatio * 350);

        let streakBonus = 0;
        if (player.streak >= 2) {
          streakBonus = player.streak * 50;
          points += streakBonus;
        }

        player.score += points;
        player.roundScore = points;

        const drawerBonus = Math.round(50 + timeRatio * 50);
        drawer.score += drawerBonus;
        drawer.roundScore = (drawer.roundScore || 0) + drawerBonus;

        this.io.to(room.id).emit('guess:correct', {
          playerId: player.id,
          playerName: player.name,
          points,
          streak: player.streak,
          streakBonus
        });

        socket.emit('hint:update', { hints: room.currentWord });
        this.broadcastRoomUpdate(room);

        const nonDrawers = room.players.filter(p => p.id !== drawer.id);
        const allGuessed = nonDrawers.every(p => p.guessedThisRound);

        if (allGuessed) {
          this.clearRoomTimers(room);
          this.endTurn(room, 'Everyone guessed the word!');
        }
        return;
      }

      // Close match check
      if (!isDrawer && this.isCloseMatch(cleanGuess, cleanWord)) {
        socket.emit('chat:close', `'${text}' is very close!`);
      }
    }

    this.io.to(room.id).emit('chat:message', {
      sender: player.name,
      senderId: player.id,
      text: text.substring(0, 150),
      isDrawer,
      guessedThisRound: player.guessedThisRound
    });
  }

  isCloseMatch(guess, word) {
    if (Math.abs(guess.length - word.length) > 1) return false;
    let mismatches = 0;
    let i = 0, j = 0;
    while (i < guess.length && j < word.length) {
      if (guess[i] !== word[j]) {
        mismatches++;
        if (mismatches > 1) return false;
        if (guess.length > word.length) i++;
        else if (word.length > guess.length) j++;
        else { i++; j++; }
      } else {
        i++; j++;
      }
    }
    return true;
  }

  endTurn(room, reason) {
    room.state = 'ROUND_OVER';
    this.clearRoomTimers(room);

    const drawer = room.players[room.drawerIndex];
    room.players.forEach(p => {
      if (drawer && p.id !== drawer.id && !p.guessedThisRound) {
        p.streak = 0;
      }
    });

    this.io.to(room.id).emit('turn:end', {
      word: room.currentWord,
      category: room.currentCategory,
      reason,
      drawerId: drawer ? drawer.id : null,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        score: p.score,
        roundScore: p.roundScore || 0,
        streak: p.streak || 0
      }))
    });

    this.broadcastRoomUpdate(room);

    let pauseTime = 7;
    room.timer = pauseTime;
    this.io.to(room.id).emit('timer:update', { timer: pauseTime, maxTime: 7 });
    room.timerInterval = setInterval(() => {
      pauseTime--;
      room.timer = pauseTime;
      this.io.to(room.id).emit('timer:update', { timer: pauseTime, maxTime: 7 });
      if (pauseTime <= 0) {
        this.clearRoomTimers(room);
        this.nextTurn(room);
      }
    }, 1000);
  }

  endGame(room) {
    room.state = 'GAME_OVER';
    this.clearRoomTimers(room);

    const podium = [...room.players].sort((a, b) => b.score - a.score);

    this.io.to(room.id).emit('game:over', {
      podium
    });

    this.broadcastRoomUpdate(room);
  }

  restartGame(socket) {
    const roomId = this.playerRoomMap.get(socket.id);
    const room = this.rooms.get(roomId);
    if (!room) return;

    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.isHost) return;

    room.state = 'LOBBY';
    room.currentRound = 1;
    room.drawerIndex = -1;
    room.drawingHistory = [];
    room.players.forEach(p => {
      p.score = 0;
      p.roundScore = 0;
      p.streak = 0;
      p.guessedThisRound = false;
    });

    this.clearRoomTimers(room);
    this.broadcastRoomUpdate(room);
    this.sendSystemMessage(room, 'Back in lobby! Host can start the next game.');
  }

  clearRoomTimers(room) {
    if (room.timerInterval) {
      clearInterval(room.timerInterval);
      room.timerInterval = null;
    }
  }

  broadcastRoomUpdate(room) {
    this.io.to(room.id).emit('room:updated', this.sanitizeRoom(room));
  }

  sendSystemMessage(room, text) {
    this.io.to(room.id).emit('chat:system', { text });
  }

  sanitizeRoom(room) {
    const drawer = room.players[room.drawerIndex];
    return {
      id: room.id,
      state: room.state,
      hostId: room.hostId,
      currentRound: room.currentRound,
      totalRounds: room.settings.rounds,
      difficulty: room.currentDifficulty,
      timer: room.timer,
      maxTimer: room.maxTimer,
      drawerId: drawer ? drawer.id : null,
      drawerName: drawer ? drawer.name : null,
      players: room.players.map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        score: p.score,
        streak: p.streak || 0,
        isHost: p.isHost,
        guessedThisRound: p.guessedThisRound
      }))
    };
  }
}

module.exports = RoomManager;
