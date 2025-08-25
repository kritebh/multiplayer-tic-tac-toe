const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Game state
const games = new Map();
const players = new Map();
const playerSessions = new Map(); // Store player names and scores for the session

// Game logic
function checkWinner(board) {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
    [0, 4, 8], [2, 4, 6] // diagonals
  ];

  for (let line of lines) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  return null;
}

function isBoardFull(board) {
  return board.every(cell => cell !== null);
}

function getNetworkIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        return interface.address;
      }
    }
  }
  return 'localhost';
}

function createGame() {
  const gameId = Math.random().toString(36).substring(2, 8);
  const game = {
    id: gameId,
    board: Array(9).fill(null),
    players: [],
    currentPlayer: 0,
    gameOver: false,
    winner: null,
    scores: { X: 0, O: 0 }, // Track scores for this game session
    nextStartingPlayer: 0 // Alternates who starts each new game
  };
  games.set(gameId, game);
  return game;
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join game
  socket.on('joinGame', (data) => {
    try {
      const { gameId, playerName } = data;
      let game;
      
      if (gameId && gameId.trim() !== '') {
        // Try to join existing game
        game = games.get(gameId);
        if (!game) {
          socket.emit('error', 'Game not found');
          return;
        }
      } else {
        // Create new game
        game = createGame();
      }

      if (game.players.length >= 2) {
        socket.emit('gameFull');
        return;
      }

      const playerId = game.players.length;
      const playerSymbol = playerId === 0 ? 'X' : 'O';
      
      // Store player name and initialize score
      const playerData = {
        id: socket.id,
        symbol: playerSymbol,
        playerId: playerId,
        name: playerName || `Player ${playerId + 1}`
      };
      
      game.players.push(playerData);
      players.set(socket.id, { gameId: game.id, playerId, symbol: playerSymbol, name: playerData.name });
      
      // Initialize player session data
      if (!playerSessions.has(socket.id)) {
        playerSessions.set(socket.id, {
          name: playerData.name,
          wins: 0,
          losses: 0,
          ties: 0
        });
      }
      
      socket.join(game.id);

      console.log(`Player ${playerData.name} (${socket.id}) joined game ${game.id} as ${playerSymbol}`);

      socket.emit('gameJoined', {
        gameId: game.id,
        playerId: playerId,
        symbol: playerSymbol,
        name: playerData.name,
        board: game.board,
        currentPlayer: game.currentPlayer,
        scores: game.scores,
        players: game.players.map(p => ({ name: p.name, symbol: p.symbol })),
        nextStartingPlayer: game.nextStartingPlayer
      });

      io.to(game.id).emit('playerJoined', {
        playerCount: game.players.length,
        currentPlayer: game.currentPlayer,
        players: game.players.map(p => ({ name: p.name, symbol: p.symbol }))
      });

      if (game.players.length === 2) {
        console.log(`Game ${game.id} started with 2 players: ${game.players[0].name} vs ${game.players[1].name}`);
        io.to(game.id).emit('gameStart', {
          board: game.board,
          currentPlayer: game.currentPlayer,
          players: game.players.map(p => ({ name: p.name, symbol: p.symbol })),
          nextStartingPlayer: game.nextStartingPlayer
        });
      }
    } catch (error) {
      console.error('Error in joinGame:', error);
      socket.emit('error', 'Failed to join game');
    }
  });

  // Make move
  socket.on('makeMove', ({ gameId, index }) => {
    try {
      const game = games.get(gameId);
      const player = players.get(socket.id);

      if (!game || !player || game.gameOver) return;

      if (game.currentPlayer !== player.playerId) return;
      if (game.board[index] !== null) return;

      game.board[index] = player.symbol;
      game.currentPlayer = game.currentPlayer === 0 ? 1 : 0;

      const winner = checkWinner(game.board);
      const isFull = isBoardFull(game.board);

      if (winner) {
        game.gameOver = true;
        game.winner = winner;
        
        // Update scores
        game.scores[winner]++;
        
        // Update player session stats
        game.players.forEach(player => {
          const session = playerSessions.get(player.id);
          if (session) {
            if (player.symbol === winner) {
              session.wins++;
            } else {
              session.losses++;
            }
          }
        });
        
        console.log(`Game ${gameId} won by ${winner}! Scores: X=${game.scores.X}, O=${game.scores.O}`);
        // Alternate starting player for next game
        game.nextStartingPlayer = game.nextStartingPlayer === 0 ? 1 : 0;
      } else if (isFull) {
        game.gameOver = true;
        game.winner = 'tie';
        
        // Update ties for all players
        game.players.forEach(player => {
          const session = playerSessions.get(player.id);
          if (session) {
            session.ties++;
          }
        });
        
        console.log(`Game ${gameId} ended in a tie! Scores: X=${game.scores.X}, O=${game.scores.O}`);
        // Alternate starting player for next game
        game.nextStartingPlayer = game.nextStartingPlayer === 0 ? 1 : 0;
      }

      io.to(gameId).emit('moveMade', {
        board: game.board,
        currentPlayer: game.currentPlayer,
        gameOver: game.gameOver,
        winner: game.winner,
        scores: game.scores,
        nextStartingPlayer: game.nextStartingPlayer
      });
    } catch (error) {
      console.error('Error in makeMove:', error);
      socket.emit('error', 'Failed to make move');
    }
  });

  // Reset game
  socket.on('resetGame', (gameId) => {
    try {
      const game = games.get(gameId);
      if (!game) return;

      game.board = Array(9).fill(null);
      // Start with the designated next starting player
      game.currentPlayer = game.nextStartingPlayer;
      game.gameOver = false;
      game.winner = null;

      io.to(gameId).emit('gameReset', {
        board: game.board,
        currentPlayer: game.currentPlayer,
        scores: game.scores,
        players: game.players.map(p => ({ name: p.name, symbol: p.symbol })),
        nextStartingPlayer: game.nextStartingPlayer
      });
    } catch (error) {
      console.error('Error in resetGame:', error);
      socket.emit('error', 'Failed to reset game');
    }
  });

  // Leave game
  socket.on('leaveGame', () => {
    try {
      console.log('User leaving game:', socket.id);
      const player = players.get(socket.id);
      
      if (player) {
        const game = games.get(player.gameId);
        if (game) {
          game.players = game.players.filter(p => p.id !== socket.id);
          
          if (game.players.length === 0) {
            games.delete(player.gameId);
            console.log(`Game ${player.gameId} deleted - no players left`);
          } else {
            io.to(player.gameId).emit('playerLeft');
            console.log(`Player left game ${player.gameId}, ${game.players.length} players remaining`);
          }
        }
        players.delete(socket.id);
      }
    } catch (error) {
      console.error('Error in leaveGame:', error);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    try {
      console.log('User disconnected:', socket.id);
      const player = players.get(socket.id);
      
      if (player) {
        const game = games.get(player.gameId);
        if (game) {
          game.players = game.players.filter(p => p.id !== socket.id);
          
          if (game.players.length === 0) {
            games.delete(player.gameId);
            console.log(`Game ${player.gameId} deleted due to disconnect`);
          } else {
            io.to(player.gameId).emit('playerLeft');
            console.log(`Player disconnected from game ${player.gameId}, ${game.players.length} players remaining`);
          }
        }
        players.delete(socket.id);
      }
    } catch (error) {
      console.error('Error in disconnect:', error);
    }
  });

  // Error handler
  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });
});

// Routes
app.get('/', (req, res) => {
  try {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } catch (error) {
    console.error('Error serving index.html:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.get('/api/games', (req, res) => {
  try {
    const gameList = Array.from(games.values()).map(game => ({
      id: game.id,
      playerCount: game.players.length,
      gameOver: game.gameOver
    }));
    res.json(gameList);
  } catch (error) {
    console.error('Error in /api/games:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Express error:', error);
  res.status(500).send('Internal Server Error');
});

const PORT = process.env.PORT || 3000;
const networkIP = getNetworkIP();

server.listen(PORT, '0.0.0.0', () => {
  console.log('🎮 Multiplayer Tic Tac Toe Server Started!');
  console.log('='.repeat(50));
  console.log(`📍 Local Access: http://localhost:${PORT}`);
  console.log(`🌐 Network Access: http://${networkIP}:${PORT}`);
  console.log('='.repeat(50));
  console.log('📱 Share the Network URL with friends on the same WiFi!');
  console.log('');
});

// Handle server errors
server.on('error', (error) => {
  console.error('Server error:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
}); 