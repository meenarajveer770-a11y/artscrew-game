/**
 * ARTSCREW - Client Game Controller (V3 - Final Polished)
 * Progressive Levels, Categories, Pencil Control, Live Reactions, Star Ratings, Streaks.
 */

class SoundEffects {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playTone(freq, duration, type = 'sine', gainVal = 0.1) {
    if (this.muted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {}
  }

  playCorrect() {
    this.playTone(523.25, 0.15, 'triangle', 0.15);
    setTimeout(() => this.playTone(659.25, 0.15, 'triangle', 0.15), 90);
    setTimeout(() => this.playTone(783.99, 0.35, 'triangle', 0.2), 180);
  }

  playTurnStart() {
    this.playTone(440, 0.2, 'sine', 0.15);
    setTimeout(() => this.playTone(880, 0.3, 'sine', 0.18), 140);
  }

  playTick() {
    this.playTone(800, 0.04, 'triangle', 0.04);
  }

  playPop() {
    this.playTone(600, 0.08, 'sine', 0.08);
  }

  playFanfare() {
    const notes = [440, 554.37, 659.25, 880];
    notes.forEach((freq, idx) => {
      setTimeout(() => this.playTone(freq, 0.4, 'square', 0.12), idx * 150);
    });
  }
}

class GameClient {
  constructor() {
    // Connect to Render backend if loaded from an external host (e.g. Cloudflare Pages or WebView), or local server if on localhost
    const isLocalhost = window.location.hostname === 'localhost' ||
                        window.location.hostname === '127.0.0.1' ||
                        window.location.hostname.startsWith('192.168.') ||
                        window.location.hostname.startsWith('172.');

    const backendUrl = isLocalhost ? undefined : 'https://artscrew-game.onrender.com';

    this.socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      timeout: 20000
    });

    // Reconnect automatically when phone screen turns back on or app is reopened
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.socket.connected) {
        this.socket.connect();
      }
    });
    window.addEventListener('focus', () => {
      if (this.socket && !this.socket.connected) {
        this.socket.connect();
      }
    });

    this.sound = new SoundEffects();
    this.drawingEngine = null;

    this.player = {
      name: '',
      avatar: { color: '#4361ee', eyes: '👀', mouth: '👄' }
    };
    this.currentRoom = null;
    this.isDrawer = false;
    this.currentRevealedWord = '';

    // UI Elements
    this.lobbyView = document.getElementById('view-lobby');
    this.gameView = document.getElementById('view-game');
    this.avatarPreview = document.getElementById('avatar-preview');
    this.playerNameInput = document.getElementById('input-player-name');
    this.roomCodeInput = document.getElementById('input-room-code');
    this.playerListEl = document.getElementById('player-list');
    this.wordDisplayEl = document.getElementById('word-display');
    this.wordCategoryBadge = document.getElementById('word-category-badge');
    this.timerBoxEl = document.getElementById('timer-box');
    this.timerNumberEl = document.getElementById('timer-number');
    this.chatMessagesEl = document.getElementById('chat-messages');
    this.chatForm = document.getElementById('chat-form');
    this.guessInput = document.getElementById('input-guess');
    this.hostControlsEl = document.getElementById('host-controls');
    this.badgeDifficulty = document.getElementById('badge-difficulty');
    this.reactionStreamEl = document.getElementById('reaction-stream');

    this.init();
  }

  init() {
    if (this.gameView) this.gameView.style.setProperty('display', 'none', 'important');
    if (this.lobbyView) this.lobbyView.style.setProperty('display', 'flex', 'important');

    this.initDrawingEngine();
    this.initAvatarSelector();
    this.initLobbyEvents();
    this.initReactionEvents();
    this.initStarRatingEvents();
    this.initSocketEvents();
    this.checkUrlForRoom();

    const btnSound = document.getElementById('btn-sound-toggle');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        this.sound.muted = !this.sound.muted;
        btnSound.textContent = this.sound.muted ? '🔇' : '🔊';
      });
    }

    const btnSaveDrawing = document.getElementById('btn-save-drawing');
    if (btnSaveDrawing) {
      btnSaveDrawing.addEventListener('click', () => {
        this.drawingEngine.downloadImage(this.currentRevealedWord || 'Artwork');
      });
    }

    const btnCloseRoundEnd = document.getElementById('btn-close-round-end');
    if (btnCloseRoundEnd) {
      btnCloseRoundEnd.addEventListener('click', () => {
        this.closeRoundEndOverlay();
      });
    }

    const btnNextRound = document.getElementById('btn-next-round');
    if (btnNextRound) {
      btnNextRound.addEventListener('click', () => {
        this.closeRoundEndOverlay();
      });
    }

    const overlayRoundEnd = document.getElementById('overlay-round-end');
    if (overlayRoundEnd) {
      overlayRoundEnd.addEventListener('click', (e) => {
        if (e.target === overlayRoundEnd) {
          this.closeRoundEndOverlay();
        }
      });
    }

    const btnCloseGameOver = document.getElementById('btn-close-game-over');
    const overlayGameOver = document.getElementById('overlay-game-over');
    if (btnCloseGameOver && overlayGameOver) {
      btnCloseGameOver.addEventListener('click', () => {
        overlayGameOver.classList.remove('active');
      });
    }
    const btnPlayAgain = document.getElementById('btn-play-again');
    if (btnPlayAgain) {
      btnPlayAgain.addEventListener('click', () => {
        window.location.reload();
      });
    }
  }

  closeRoundEndOverlay() {
    const overlay = document.getElementById('overlay-round-end');
    if (overlay) overlay.classList.remove('active');
    if (this.roundPauseInterval) {
      clearInterval(this.roundPauseInterval);
      this.roundPauseInterval = null;
    }
  }

  initDrawingEngine() {
    this.drawingEngine = new DrawingEngine('drawing-canvas', (action) => {
      this.socket.emit('draw:action', action);
    });
    this.drawingEngine.setCanDraw(false);
  }

  initAvatarSelector() {
    const avatarColors = [
      '#4361ee', '#f72585', '#7209b7', '#4cc9f0',
      '#2ec4b6', '#ff9f1c', '#e71d36', '#10b981'
    ];
    const eyeSets = ['👀', '😎', '🤓', '🥺', '🤩', '🧐'];
    const mouthSets = ['👄', '👅', '😁', '🤐', '😮', '🤠'];

    const container = document.getElementById('avatar-colors');
    if (container) {
      avatarColors.forEach((color, idx) => {
        const dot = document.createElement('div');
        dot.className = `avatar-color-dot ${idx === 0 ? 'active' : ''}`;
        dot.style.backgroundColor = color;
        dot.addEventListener('click', () => {
          this.player.avatar.color = color;
          this.updateAvatarPreview();
          document.querySelectorAll('.avatar-color-dot').forEach(d => d.classList.remove('active'));
          dot.classList.add('active');
        });
        container.appendChild(dot);
      });
    }

    const btnRandom = document.getElementById('btn-random-avatar');
    if (btnRandom) {
      btnRandom.addEventListener('click', () => {
        const randColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];
        const randEyes = eyeSets[Math.floor(Math.random() * eyeSets.length)];
        const randMouth = mouthSets[Math.floor(Math.random() * mouthSets.length)];
        this.player.avatar = { color: randColor, eyes: randEyes, mouth: randMouth };
        this.updateAvatarPreview();
      });
    }

    const storedName = localStorage.getItem('artscrew_name');
    if (storedName && this.playerNameInput) {
      this.playerNameInput.value = storedName;
    }

    this.updateAvatarPreview();
  }

  updateAvatarPreview() {
    if (this.avatarPreview) {
      this.avatarPreview.style.backgroundColor = this.player.avatar.color;
      const eyesEl = this.avatarPreview.querySelector('.avatar-eyes');
      const mouthEl = this.avatarPreview.querySelector('.avatar-mouth');
      if (eyesEl) eyesEl.textContent = this.player.avatar.eyes;
      if (mouthEl) mouthEl.textContent = this.player.avatar.mouth;
    }
  }

  initLobbyEvents() {
    const btnQuickPlay = document.getElementById('btn-quickplay');
    const btnCreate = document.getElementById('btn-create-room');
    const btnJoin = document.getElementById('btn-join-room');

    if (btnQuickPlay) {
      btnQuickPlay.addEventListener('click', () => {
        this.sound.init();
        const name = (this.playerNameInput.value.trim() || 'Artist');
        localStorage.setItem('artscrew_name', name);
        this.player.name = name;

        btnQuickPlay.disabled = true;
        btnQuickPlay.textContent = 'Connecting...';

        this.socket.emit('room:quickplay', { playerData: this.player }, (res) => {
          btnQuickPlay.disabled = false;
          btnQuickPlay.textContent = '▶️ PLAY (Quick Match)';
          if (!res.success) {
            alert(res.message || 'Could not connect to a match.');
          }
        });
      });
    }

    const sliderRounds = document.getElementById('setting-rounds');
    const labelRounds = document.getElementById('val-rounds');
    if (sliderRounds && labelRounds) {
      sliderRounds.addEventListener('input', () => labelRounds.textContent = sliderRounds.value);
    }

    btnCreate.addEventListener('click', () => {
      this.sound.init();
      const name = (this.playerNameInput.value.trim() || 'Artist');
      localStorage.setItem('artscrew_name', name);
      this.player.name = name;

      const difficultySelect = document.getElementById('setting-difficulty');
      const customWordsInput = document.getElementById('setting-custom-words');
      const customWords = customWordsInput && customWordsInput.value
        ? customWordsInput.value.split(',').map(w => w.trim()).filter(Boolean)
        : [];

      const settings = {
        rounds: sliderRounds ? parseInt(sliderRounds.value, 10) : 3,
        difficulty: difficultySelect ? difficultySelect.value : 'dynamic',
        customWords
      };

      btnCreate.disabled = true;
      btnCreate.textContent = 'Creating...';

      this.socket.emit('room:create', { playerData: this.player, settings }, (res) => {
        btnCreate.disabled = false;
        btnCreate.textContent = '✨ Create New Room';
        if (!res.success) {
          alert(res.message || 'Could not create room.');
        }
      });
    });

    btnJoin.addEventListener('click', () => this.handleJoin());
    this.roomCodeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleJoin();
    });

    this.chatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = this.guessInput.value.trim();
      if (!text) return;
      this.socket.emit('chat:message', text);
      this.guessInput.value = '';
    });

    const badgeRoom = document.getElementById('badge-room-code');
    if (badgeRoom) {
      badgeRoom.addEventListener('click', () => {
        if (!this.currentRoom) return;
        const inviteUrl = `${window.location.origin}?room=${this.currentRoom.id}`;
        navigator.clipboard.writeText(inviteUrl).then(() => {
          this.addChatMessage('system', `Room link copied to clipboard! Share with friends.`);
        }).catch(() => {
          this.addChatMessage('system', `Room Code: ${this.currentRoom.id}`);
        });
      });
    }

    const btnStart = document.getElementById('btn-start-game');
    if (btnStart) {
      btnStart.addEventListener('click', () => {
        this.socket.emit('game:start');
      });
    }

    const btnPlayAgain = document.getElementById('btn-play-again');
    if (btnPlayAgain) {
      btnPlayAgain.addEventListener('click', () => {
        this.socket.emit('game:restart');
        document.getElementById('overlay-game-over').classList.remove('active');
      });
    }
  }

  initReactionEvents() {
    document.querySelectorAll('.btn-reaction').forEach(btn => {
      btn.addEventListener('click', () => {
        const emoji = btn.dataset.emoji;
        this.socket.emit('reaction:send', emoji);
        this.spawnFloatingReaction(emoji);
        this.sound.playPop();
      });
    });
  }

  initStarRatingEvents() {
    document.querySelectorAll('.star-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const stars = parseInt(btn.dataset.star, 10);
        this.socket.emit('rate:drawing', stars);
        const feedback = document.getElementById('rating-feedback-text');
        if (feedback) feedback.textContent = `You rated this artwork ${stars} ⭐!`;
        document.querySelectorAll('.star-btn').forEach(b => b.disabled = true);
      });
    });
  }

  spawnFloatingReaction(emoji) {
    if (!this.reactionStreamEl) return;
    const bubble = document.createElement('div');
    bubble.className = 'floating-reaction';
    bubble.textContent = emoji;

    const randomLeft = Math.floor(Math.random() * 80) + 10;
    bubble.style.left = `${randomLeft}%`;

    this.reactionStreamEl.appendChild(bubble);
    setTimeout(() => {
      bubble.remove();
    }, 3000);
  }

  handleJoin() {
    this.sound.init();
    const code = this.roomCodeInput.value.trim().toUpperCase();
    if (!code) {
      alert('Please enter a 4-letter Room Code.');
      return;
    }
    const name = (this.playerNameInput.value.trim() || 'Artist');
    localStorage.setItem('artscrew_name', name);
    this.player.name = name;

    this.socket.emit('room:join', { roomId: code, playerData: this.player }, (res) => {
      if (!res.success) {
        alert(res.message || 'Unable to join room.');
      }
    });
  }

  checkUrlForRoom() {
    const params = new URLSearchParams(window.location.search);
    const room = params.get('room');
    if (room && this.roomCodeInput) {
      this.roomCodeInput.value = room.toUpperCase();
    }
  }

  initSocketEvents() {
    this.socket.on('room:joined', ({ room, player, drawingHistory }) => {
      this.currentRoom = room;
      this.player = player;
      this.showGameView();
      this.updateRoomDisplay(room);

      this.drawingEngine.clearLocal(false);
      if (drawingHistory && drawingHistory.length > 0) {
        drawingHistory.forEach(action => this.drawingEngine.executeRemoteAction(action));
      }
    });

    this.socket.on('room:updated', (room) => {
      this.currentRoom = room;
      this.updateRoomDisplay(room);
    });

    this.socket.on('timer:update', ({ timer }) => {
      this.timerNumberEl.textContent = timer;
      if (timer <= 10) {
        this.timerBoxEl.classList.add('urgent');
        this.sound.playTick();
      } else {
        this.timerBoxEl.classList.remove('urgent');
      }
    });

    this.socket.on('turn:choose_word', ({ choices, categories, difficulty, round, timeLimit }) => {
      this.closeRoundEndOverlay();
      this.showWordChoiceModal(choices, categories, difficulty, round, timeLimit);
    });

    this.socket.on('turn:waiting_for_drawer', ({ drawerName, difficulty, round }) => {
      this.closeRoundEndOverlay();
      this.updateDifficultyBadge(difficulty, round);
      this.wordCategoryBadge.style.display = 'none';
      this.wordDisplayEl.innerHTML = `<span class="placeholder-text"><strong>${drawerName}</strong> is choosing a word...</span>`;
      this.drawingEngine.clearLocal(false);
      this.drawingEngine.setCanDraw(false);
      document.getElementById('drawer-banner').style.display = 'none';
      document.getElementById('modal-word-choice').classList.remove('active');
    });

    this.socket.on('turn:draw_start', (data) => {
      this.closeRoundEndOverlay();
      document.getElementById('modal-word-choice').classList.remove('active');
      this.drawingEngine.clearLocal(false);

      this.sound.playTurnStart();
      this.updateDifficultyBadge(data.difficulty);

      if (data.isDrawer) {
        this.isDrawer = true;
        this.drawingEngine.setCanDraw(true);
        this.wordCategoryBadge.style.display = 'block';
        this.wordCategoryBadge.innerHTML = `📁 Category: <span>${data.category}</span>`;
        this.wordDisplayEl.innerHTML = `<span style="color: var(--accent); font-size: 26px;">${data.word.toUpperCase()}</span>`;
        
        const banner = document.getElementById('drawer-banner');
        banner.style.display = 'block';
        document.getElementById('drawer-banner-text').textContent = `✏️ Draw: ${data.word.toUpperCase()}`;
        this.guessInput.disabled = true;
        this.guessInput.placeholder = "You are drawing! Don't write the word.";
      } else {
        this.isDrawer = false;
        this.drawingEngine.setCanDraw(false);
        this.wordCategoryBadge.style.display = 'block';
        this.wordCategoryBadge.innerHTML = `📁 Category: <span>${data.category}</span>`;
        this.renderWordHints(data.hints);
        document.getElementById('drawer-banner').style.display = 'none';
        this.guessInput.disabled = false;
        this.guessInput.placeholder = `Type guess (${data.wordLength} letters)...`;
        this.guessInput.focus();
      }
    });

    this.socket.on('hint:update', ({ hints }) => {
      if (!this.isDrawer) {
        this.renderWordHints(hints);
      }
    });

    this.socket.on('draw:action', (drawData) => {
      if (drawData.senderId !== this.socket.id) {
        this.drawingEngine.executeRemoteAction(drawData);
      }
    });

    this.socket.on('reaction:bubble', ({ emoji, senderId }) => {
      if (senderId !== this.socket.id) {
        this.spawnFloatingReaction(emoji);
      }
    });

    this.socket.on('guess:correct', ({ playerId, playerName, points, streak, streakBonus }) => {
      this.sound.playCorrect();
      let msg = `🎉 ${playerName} guessed the word! (+${points} pts)`;
      if (streak >= 2) {
        msg += ` 🔥 ${streak}x STREAK (+${streakBonus} bonus!)`;
      }
      this.addChatMessage('correct-guess', msg);

      if (playerId === this.socket.id) {
        this.guessInput.disabled = true;
        this.guessInput.placeholder = 'You guessed it! Enjoy watching.';
      }
    });

    this.socket.on('chat:close', (msg) => {
      this.addChatMessage('close-guess', `👀 ${msg}`);
    });

    this.socket.on('chat:warning', (msg) => {
      this.addChatMessage('warning', `⚠️ ${msg}`);
    });

    this.socket.on('chat:message', ({ sender, text }) => {
      this.addChatMessage('normal', text, sender);
    });

    this.socket.on('chat:system', ({ text }) => {
      this.addChatMessage('system', text);
    });

    this.socket.on('turn:end', ({ word, category, reason, drawerId, players }) => {
      this.drawingEngine.setCanDraw(false);
      this.guessInput.disabled = false;
      this.guessInput.placeholder = 'Type your guess here...';
      document.getElementById('drawer-banner').style.display = 'none';

      this.currentRevealedWord = word;
      const overlay = document.getElementById('overlay-round-end');
      document.getElementById('round-end-title').textContent = reason || "Round Over!";
      document.getElementById('revealed-word').textContent = word.toUpperCase();
      document.getElementById('revealed-category').textContent = `Category: ${category}`;

      // Show star rating only to guessers
      const starRatingBox = document.getElementById('star-rating-box');
      const ratingFeedback = document.getElementById('rating-feedback-text');
      if (ratingFeedback) ratingFeedback.textContent = '';
      document.querySelectorAll('.star-btn').forEach(b => b.disabled = false);

      if (starRatingBox) {
        starRatingBox.style.display = (drawerId === this.socket.id) ? 'none' : 'block';
      }

      const scoresList = document.getElementById('round-scores-list');
      scoresList.innerHTML = '';
      players.forEach(p => {
        const row = document.createElement('div');
        row.className = 'score-gain-row';
        row.innerHTML = `
          <span>${p.name} ${p.streak >= 2 ? `🔥 ${p.streak}` : ''}</span>
          <span class="${p.roundScore > 0 ? 'score-gain-green' : ''}">
            ${p.roundScore > 0 ? `+${p.roundScore}` : '0'} pts (Total: ${p.score})
          </span>
        `;
        scoresList.appendChild(row);
      });

      // Start 7-second countdown on modal
      let pauseRemaining = 7;
      const pauseSecSpan = document.getElementById('round-pause-seconds');
      if (pauseSecSpan) pauseSecSpan.textContent = pauseRemaining;
      if (this.roundPauseInterval) clearInterval(this.roundPauseInterval);
      this.roundPauseInterval = setInterval(() => {
        pauseRemaining--;
        if (pauseSecSpan) pauseSecSpan.textContent = Math.max(0, pauseRemaining);
        if (pauseRemaining <= 0) {
          clearInterval(this.roundPauseInterval);
          this.roundPauseInterval = null;
        }
      }, 1000);

      overlay.classList.add('active');
    });

    this.socket.on('game:over', ({ podium }) => {
      this.closeRoundEndOverlay();
      this.sound.playFanfare();

      const overlay = document.getElementById('overlay-game-over');
      const container = document.getElementById('podium-container');
      container.innerHTML = '';

      const order = [podium[1], podium[0], podium[2]].filter(Boolean);
      order.forEach((p) => {
        const placeNum = p === podium[0] ? 1 : (p === podium[1] ? 2 : 3);
        const col = document.createElement('div');
        col.className = `podium-place place-${placeNum}`;
        col.innerHTML = `
          <div class="player-avatar" style="background-color: ${p.avatar.color}; width: 50px; height: 50px;">
            <span>${p.avatar.eyes}</span>
          </div>
          <strong>${p.name}</strong>
          <span style="font-size: 13px; color: var(--text-muted);">${p.score} pts</span>
          <div class="podium-pillar">${placeNum}</div>
        `;
        container.appendChild(col);
      });

      overlay.classList.add('active');
    });

    this.socket.on('error:msg', (msg) => {
      alert(msg);
    });
  }

  showGameView() {
    if (this.lobbyView) {
      this.lobbyView.classList.remove('active');
      this.lobbyView.style.setProperty('display', 'none', 'important');
    }
    if (this.gameView) {
      this.gameView.classList.add('active');
      this.gameView.style.setProperty('display', 'flex', 'important');
    }
  }

  showLobbyView() {
    if (this.gameView) {
      this.gameView.classList.remove('active');
      this.gameView.style.setProperty('display', 'none', 'important');
    }
    if (this.lobbyView) {
      this.lobbyView.classList.add('active');
      this.lobbyView.style.setProperty('display', 'flex', 'important');
    }
  }

  updateDifficultyBadge(difficulty, round = 1) {
    if (!this.badgeDifficulty) return;
    const diff = difficulty || 'easy';
    this.badgeDifficulty.className = `difficulty-badge ${diff}`;

    const labels = {
      easy: '🟢 Basic (80s)',
      medium: '🟡 Everyday (65s)',
      hard: '🔴 Creative (50s)',
      extreme: '🔥 Pro (35s)'
    };
    this.badgeDifficulty.textContent = labels[diff] || diff;
  }

  updateRoomDisplay(room) {
    document.getElementById('display-room-code').textContent = room.id;
    document.getElementById('badge-round').textContent = `Round ${room.currentRound} / ${room.totalRounds}`;
    document.getElementById('player-count').textContent = room.players.length;

    this.updateDifficultyBadge(room.difficulty, room.currentRound);

    this.playerListEl.innerHTML = '';
    room.players.forEach(p => {
      const isCurrentDrawer = p.id === room.drawerId;
      const item = document.createElement('div');
      item.className = `player-item ${isCurrentDrawer ? 'is-drawer' : ''} ${p.guessedThisRound ? 'has-guessed' : ''}`;
      item.innerHTML = `
        <div class="player-mini-avatar" style="background-color: ${p.avatar.color};">
          <span>${p.avatar.eyes}</span>
        </div>
        <div class="player-info">
          <div class="player-name">
            ${p.name} ${p.isHost ? '👑' : ''}
          </div>
          <div class="player-score">
            <span>${p.score} pts</span>
            ${p.streak >= 2 ? `<span class="streak-badge">🔥 ${p.streak}</span>` : ''}
          </div>
        </div>
        <div class="player-badge-icon">
          ${isCurrentDrawer ? '✏️' : (p.guessedThisRound ? '✅' : '')}
        </div>
      `;
      this.playerListEl.appendChild(item);
    });

    const isMeHost = room.players.some(p => p.id === this.socket.id && p.isHost);
    if (isMeHost && room.state === 'LOBBY') {
      this.hostControlsEl.style.display = 'block';
    } else {
      this.hostControlsEl.style.display = 'none';
    }
  }

  renderWordHints(hints) {
    if (!hints) return;
    const formatted = hints.split('').map(char => {
      if (char === ' ') return '&nbsp;&nbsp;';
      return `<span style="border-bottom: 2px solid #2b2d42; margin: 0 4px; display: inline-block; min-width: 14px; text-align: center;">${char === '_' ? '&nbsp;' : char.toUpperCase()}</span>`;
    }).join('');
    this.wordDisplayEl.innerHTML = formatted;
  }

  showWordChoiceModal(choices, categories, difficulty, round, timeLimit) {
    const modal = document.getElementById('modal-word-choice');
    const container = document.getElementById('word-choice-container');
    const timerEl = document.getElementById('word-choice-timer');
    const tagEl = document.getElementById('modal-difficulty-tag');

    const roundNames = {
      1: "Round 1 • Super Basic Words",
      2: "Round 2 • Familiar Objects",
      3: "Round 3 • Creative & Pop Culture",
      4: "Round 4+ • Pro & Master Words"
    };

    if (tagEl) {
      tagEl.textContent = roundNames[round] || `Round ${round} • ${(difficulty || 'Easy').toUpperCase()}`;
    }

    container.innerHTML = '';
    choices.forEach((word, idx) => {
      const category = (categories && categories[idx]) ? categories[idx] : "Object";
      const btn = document.createElement('button');
      btn.className = 'btn-word-choice';
      btn.innerHTML = `
        <span>${word.toUpperCase()}</span>
        <span class="word-choice-category">${category}</span>
      `;
      btn.addEventListener('click', () => {
        this.socket.emit('word:selected', word);
        modal.classList.remove('active');
      });
      container.appendChild(btn);
    });

    let countdown = timeLimit;
    timerEl.textContent = countdown;
    const interval = setInterval(() => {
      countdown--;
      timerEl.textContent = countdown;
      if (countdown <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    modal.classList.add('active');
  }

  addChatMessage(type, text, sender = null) {
    const msgEl = document.createElement('div');
    msgEl.className = `chat-msg ${type}`;

    if (sender) {
      msgEl.innerHTML = `<span class="sender-name">${sender}: </span><span>${this.escapeHtml(text)}</span>`;
    } else {
      msgEl.innerHTML = `<span>${this.escapeHtml(text)}</span>`;
    }

    this.chatMessagesEl.appendChild(msgEl);
    this.chatMessagesEl.scrollTop = this.chatMessagesEl.scrollHeight;
  }

  escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameClient();
});
